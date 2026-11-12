import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AppIconComponent } from '../../../shared/ui/app-icon/app-icon.component';
import { PaymentModalComponent } from '../../../shared/ui/payment-modal/payment-modal.component';
import { LoanDetails } from '../../loans/data/loan.models';
import { LoansService } from '../../loans/data/loans.service';
import { PaymentDetails } from '../../payments/data/payment.models';
import { AccessibleRoute } from '../../routes/data/route.models';
import { RoutesService } from '../../routes/data/routes.service';
import { RouteBalance } from '../../route-finances/data/route-finance.models';
import { RouteFinancesService } from '../../route-finances/data/route-finances.service';
import {
  AgendaItem,
  AgendaResponse,
  AgendaStatus,
  NonPaymentReason,
  RegisterWillNotPayRequest,
} from '../data/agenda.models';
import { AgendaService } from '../data/agenda.service';

export type SegmentNav = 'PENDING' | 'PAID' | 'WILL_NOT_PAY' | 'ADVANCED';

export interface FilterStatusOption {
  key: string;
  label: string;
}

export interface FrequencyOption {
  key: string;
  label: string;
}

@Component({
  selector: 'app-agenda-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, CurrencyPipe, PaymentModalComponent, AppIconComponent],
  templateUrl: './agenda.page.html',
  styleUrl: './agenda.page.scss',
})
export class AgendaPage implements OnInit {
  private readonly agendaService = inject(AgendaService);
  private readonly routesService = inject(RoutesService);
  private readonly loansService = inject(LoansService);
  private readonly routeFinancesService = inject(RouteFinancesService);
  private readonly router = inject(Router);

  readonly routes = signal<readonly AccessibleRoute[]>([]);
  readonly agenda = signal<AgendaResponse | null>(null);
  readonly routeBalance = signal<RouteBalance | null>(null);
  readonly balanceLoading = signal(false);
  readonly isBalanceHidden = signal<boolean>(this.getStoredBalanceHidden());
  readonly loading = signal(false);
  readonly error = signal('');
  readonly success = signal('');
  readonly searchQuery = signal('');

  // 4-segment navigation & filters
  readonly activeNavSegment = signal<SegmentNav>('PENDING');

  // Advanced filter dialog state
  readonly isFilterModalOpen = signal(false);
  readonly selectedStatuses = signal<Set<string>>(new Set());
  readonly selectedFrequencies = signal<Set<string>>(new Set());

  // Temp state inside filter modal
  readonly tempStatuses = signal<Set<string>>(new Set());
  readonly tempFrequencies = signal<Set<string>>(new Set());

  readonly statusOptions: FilterStatusOption[] = [
    { key: 'ALL', label: 'Todos' },
    { key: 'OVERDUE', label: 'En mora' },
    { key: 'DUE_TODAY', label: 'Cobro hoy' },
    { key: 'COLLECTED', label: 'Pagos' },
    { key: 'WILL_NOT_PAY', label: 'No pagará hoy' },
    { key: 'UP_TO_DATE', label: 'Al día' },
  ];

  readonly frequencyOptions: FrequencyOption[] = [
    { key: 'ALL', label: 'Todos' },
    { key: 'DAILY', label: 'Diario' },
    { key: 'WEEKLY', label: 'Semanal' },
    { key: 'MONTHLY', label: 'Mensual' },
  ];

  readonly hasCustomFilters = computed(() => {
    return this.selectedStatuses().size > 0 || this.selectedFrequencies().size > 0;
  });

  // Metrics
  readonly totalLoanedToday = signal(0);
  readonly loanedCountToday = signal(0);

  // Non-payment reasons & modal state
  readonly isWillNotPayModalOpen = signal(false);
  readonly targetWillNotPayItem = signal<AgendaItem | null>(null);
  readonly nonPaymentReasons = signal<readonly NonPaymentReason[]>([]);
  readonly reasonsLoading = signal(false);
  readonly selectedReasonId = signal<string>('');
  readonly customReasonName = signal<string>('');
  readonly nonPaymentObservations = signal<string>('');
  readonly submittingNonPayment = signal(false);

  // Manage reasons inside modal
  readonly isManageReasonsOpen = signal(false);
  readonly newReasonName = signal('');
  readonly newReasonDescription = signal('');
  readonly savingNewReason = signal(false);

  // Daily "No pagará hoy" state (persisted per route date)
  readonly willNotPayTodayIds = signal<Set<string>>(new Set());

  // Custom order of loan cards per route
  readonly customOrderIds = signal<string[]>([]);

  // Payment modal state
  readonly isPaymentModalOpen = signal(false);
  readonly payingLoan = signal<LoanDetails | null>(null);

  readonly filterForm = new FormGroup({
    routeId: new FormControl<string>('', { nonNullable: true }),
    date: new FormControl<string>(new Date().toISOString().substring(0, 10), { nonNullable: true }),
  });

  itemKey(item: AgendaItem): string {
    return item.activeLoanId || item.customerId;
  }

  effectiveStatus(item: AgendaItem): AgendaStatus {
    if (item.collectedTodayAmount > 0 || item.status === 'Collected') {
      return 'Collected';
    }
    const key = this.itemKey(item);
    if (this.willNotPayTodayIds().has(key) || this.willNotPayTodayIds().has(item.customerId) || item.status === 'WillNotPayToday') {
      return 'WillNotPayToday';
    }
    return item.status;
  }

  effectiveStatusLabel(item: AgendaItem): string {
    const st = this.effectiveStatus(item);
    if (st === 'Collected') {
      return 'Cobrado hoy';
    }
    if (st === 'WillNotPayToday') {
      return item.nonPaymentReasonName ? `No paga hoy (${item.nonPaymentReasonName})` : 'Hoy no pagará';
    }
    return item.statusLabel;
  }

  isPending(item: AgendaItem): boolean {
    if (item.collectedTodayAmount > 0 || item.status === 'Collected') {
      return false;
    }
    const st = this.effectiveStatus(item);
    return st === 'DueToday' || st === 'Overdue';
  }

  // Financial Estimates
  // 1. Estimado de cobro hoy: cuotas de hoy + valor de 1 cuota para clientes en mora
  readonly estimatedDueToday = computed(() => {
    const items = this.agenda()?.items ?? [];
    return items.reduce((sum, item) => {
      const st = this.effectiveStatus(item);
      if (st === 'WillNotPayToday' || st === 'Collected') {
        return sum;
      }
      if (item.dueTodayAmount > 0) {
        return sum + item.dueTodayAmount;
      }
      if (item.overdueAmount > 0) {
        const oneInstallment = (item.installmentAmount && item.installmentAmount > 0)
          ? item.installmentAmount
          : item.overdueAmount;
        return sum + oneInstallment;
      }
      return sum;
    }, 0);
  });

  // 2. Estimado pago Total: todas las cuotas de hoy + todas las cuotas atrasadas
  readonly estimatedTotalPayment = computed(() => {
    const items = this.agenda()?.items ?? [];
    return items.reduce((sum, item) => {
      const st = this.effectiveStatus(item);
      if (st === 'WillNotPayToday') {
        return sum;
      }
      return sum + (item.dueTodayAmount || 0) + (item.overdueAmount || 0);
    }, 0);
  });

  // Segment counts
  readonly allCount = computed(() => {
    return this.agenda()?.items?.length ?? 0;
  });

  readonly pendingCount = computed(() => {
    const items = this.agenda()?.items ?? [];
    return items.filter((i) => this.isPending(i)).length;
  });

  readonly collectedCount = computed(() => {
    const items = this.agenda()?.items ?? [];
    return items.filter((i) => this.effectiveStatus(i) === 'Collected' || i.collectedTodayAmount > 0).length;
  });

  readonly willNotPayCount = computed(() => {
    const items = this.agenda()?.items ?? [];
    return items.filter((i) => this.effectiveStatus(i) === 'WillNotPayToday').length;
  });

  readonly overdueCount = computed(() => {
    const items = this.agenda()?.items ?? [];
    return items.filter((i) => this.effectiveStatus(i) === 'Overdue').length;
  });

  readonly dueTodayCount = computed(() => {
    const items = this.agenda()?.items ?? [];
    return items.filter((i) => this.effectiveStatus(i) === 'DueToday').length;
  });

  // Ordered items (respecting custom user sequence and finalizing loans to bottom)
  readonly orderedItems = computed(() => {
    const items = [...(this.agenda()?.items ?? [])];
    if (items.length === 0) return [];

    const orderMap = new Map<string, number>();
    this.customOrderIds().forEach((id, idx) => orderMap.set(id, idx));

    return items.sort((a, b) => {
      const aFinalized = this.effectiveStatus(a) === 'Collected' || a.loanBalance <= 0;
      const bFinalized = this.effectiveStatus(b) === 'Collected' || b.loanBalance <= 0;

      // Al finalizar el crédito siempre esta ubicación irá a lo más abajo
      if (aFinalized && !bFinalized) return 1;
      if (!aFinalized && bFinalized) return -1;

      const aKey = this.itemKey(a);
      const bKey = this.itemKey(b);
      const aIdx = orderMap.has(aKey) ? orderMap.get(aKey)! : 999999;
      const bIdx = orderMap.has(bKey) ? orderMap.get(bKey)! : 999999;

      if (aIdx !== bIdx) return aIdx - bIdx;
      return a.customerName.localeCompare(b.customerName);
    });
  });

  // Filtered by active segment and advanced filters
  readonly filteredByStatusItems = computed(() => {
    const items = this.orderedItems();
    const seg = this.activeNavSegment();

    if (seg === 'PENDING') {
      return items.filter((i) => this.isPending(i));
    }
    if (seg === 'PAID') {
      return items.filter((i) => this.effectiveStatus(i) === 'Collected' || i.collectedTodayAmount > 0);
    }
    if (seg === 'WILL_NOT_PAY') {
      return items.filter((i) => this.effectiveStatus(i) === 'WillNotPayToday');
    }

    // seg === 'ADVANCED'
    const statusSet = this.selectedStatuses();
    const freqSet = this.selectedFrequencies();

    return items.filter((item) => {
      // 1. Status matching
      let statusMatches = true;
      if (statusSet.size > 0 && !statusSet.has('ALL')) {
        const st = this.effectiveStatus(item);
        const matchOverdue = statusSet.has('OVERDUE') && st === 'Overdue';
        const matchDueToday = statusSet.has('DUE_TODAY') && st === 'DueToday';
        const matchCollected = statusSet.has('COLLECTED') && (st === 'Collected' || item.collectedTodayAmount > 0);
        const matchWillNotPay = statusSet.has('WILL_NOT_PAY') && st === 'WillNotPayToday';
        const matchUpToDate = statusSet.has('UP_TO_DATE') && st === 'UpToDate';

        statusMatches = matchOverdue || matchDueToday || matchCollected || matchWillNotPay || matchUpToDate;
      }

      // 2. Frequency matching
      let freqMatches = true;
      if (freqSet.size > 0 && !freqSet.has('ALL')) {
        const itemFreq = (item.paymentFrequency || '').toUpperCase();
        const matchDaily = freqSet.has('DAILY') && (itemFreq === 'DAILY' || itemFreq === 'DIARIO');
        const matchWeekly = freqSet.has('WEEKLY') && (itemFreq === 'WEEKLY' || itemFreq === 'SEMANAL');
        const matchMonthly = freqSet.has('MONTHLY') && (itemFreq === 'MONTHLY' || itemFreq === 'MENSUAL');

        freqMatches = matchDaily || matchWeekly || matchMonthly;
      }

      return statusMatches && freqMatches;
    });
  });

  // Filtered items (status + search query)
  readonly filteredItems = computed(() => {
    const items = this.filteredByStatusItems();
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) return items;

    return items.filter((item) => {
      const name = (item.customerName || '').toLowerCase();
      const alias = (item.alias || '').toLowerCase();
      const business = (item.businessOrWorkName || '').toLowerCase();
      const address = (item.address || '').toLowerCase();
      const phone = (item.primaryPhone || '').toLowerCase();
      const balance = item.loanBalance.toString();
      const due = item.dueTodayAmount.toString();
      const overdue = item.overdueAmount.toString();

      return (
        name.includes(query) ||
        alias.includes(query) ||
        business.includes(query) ||
        address.includes(query) ||
        phone.includes(query) ||
        balance.includes(query) ||
        due.includes(query) ||
        overdue.includes(query)
      );
    });
  });

  async ngOnInit(): Promise<void> {
    await this.loadRoutes();
  }

  async loadRoutes(): Promise<void> {
    try {
      this.loading.set(true);
      const accessibleRoutes = await this.routesService.listAccessible();
      this.routes.set(accessibleRoutes);
      if (accessibleRoutes.length > 0) {
        this.filterForm.patchValue({ routeId: accessibleRoutes[0].id });
        await this.loadAgenda();
      }
    } catch (err: unknown) {
      this.error.set(err instanceof Error ? err.message : 'Error cargando las rutas.');
    } finally {
      this.loading.set(false);
    }
  }

  async loadAgenda(): Promise<void> {
    const routeId = this.filterForm.controls.routeId.value;
    const date = this.filterForm.controls.date.value;
    if (!routeId) return;

    try {
      this.loading.set(true);
      this.error.set('');

      // Load will-not-pay ids for current date
      this.willNotPayTodayIds.set(this.loadWillNotPayTodayIds(date));

      // Load custom item order for this route
      this.customOrderIds.set(this.loadRouteItemOrder(routeId));

      const [data, loansRes] = await Promise.all([
        this.agendaService.getAgenda(routeId, date),
        this.loansService.search(routeId, undefined, undefined, 1, 100).catch(() => ({ items: [] })),
        this.loadRouteBalance(routeId),
      ]);

      this.agenda.set(data);

      const targetDateStr = date || new Date().toISOString().substring(0, 10);
      const loansToday = (loansRes.items ?? []).filter((l) => {
        const sDate = (l.startsAtUtc || l.createdAtUtc || '').substring(0, 10);
        return sDate === targetDateStr;
      });

      const totalLoaned = loansToday.reduce((sum, l) => sum + (l.principalAmount ?? 0), 0);
      this.totalLoanedToday.set(totalLoaned);
      this.loanedCountToday.set(loansToday.length);
    } catch (err: unknown) {
      this.error.set(err instanceof Error ? err.message : 'Error al consultar la agenda.');
    } finally {
      this.loading.set(false);
    }
  }

  async loadRouteBalance(routeId?: string): Promise<void> {
    const targetRouteId = routeId || this.filterForm.controls.routeId.value;
    if (!targetRouteId) {
      this.routeBalance.set(null);
      return;
    }
    try {
      this.balanceLoading.set(true);
      const bal = await this.routeFinancesService.getBalance(targetRouteId);
      this.routeBalance.set(bal);
    } catch {
      this.routeBalance.set(null);
    } finally {
      this.balanceLoading.set(false);
    }
  }

  getStoredBalanceHidden(): boolean {
    try {
      return localStorage.getItem('cobroup_hide_balance') === 'true';
    } catch {
      return false;
    }
  }

  toggleBalanceVisibility(event?: Event): void {
    event?.stopPropagation();
    this.isBalanceHidden.update((v) => {
      const next = !v;
      try {
        localStorage.setItem('cobroup_hide_balance', String(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }

  selectSegment(seg: SegmentNav): void {
    this.activeNavSegment.set(seg);
  }

  openFilterModal(): void {
    this.tempStatuses.set(new Set(this.selectedStatuses()));
    this.tempFrequencies.set(new Set(this.selectedFrequencies()));
    this.isFilterModalOpen.set(true);
  }

  closeFilterModal(): void {
    this.isFilterModalOpen.set(false);
  }

  toggleTempStatus(key: string): void {
    this.tempStatuses.update((set) => {
      const next = new Set(set);
      if (key === 'ALL') {
        next.clear();
        next.add('ALL');
        return next;
      }
      next.delete('ALL');
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  toggleTempFrequency(key: string): void {
    this.tempFrequencies.update((set) => {
      const next = new Set(set);
      if (key === 'ALL') {
        next.clear();
        next.add('ALL');
        return next;
      }
      next.delete('ALL');
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  applyFilters(): void {
    const statuses = new Set(this.tempStatuses());
    const freqs = new Set(this.tempFrequencies());

    this.selectedStatuses.set(statuses);
    this.selectedFrequencies.set(freqs);

    this.isFilterModalOpen.set(false);
    this.activeNavSegment.set('ADVANCED');
  }

  clearFilters(): void {
    this.tempStatuses.set(new Set());
    this.tempFrequencies.set(new Set());
    this.selectedStatuses.set(new Set());
    this.selectedFrequencies.set(new Set());
    this.activeNavSegment.set('PENDING');
    this.isFilterModalOpen.set(false);
  }

  onSearchInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.searchQuery.set(val);
  }

  clearSearch(): void {
    this.searchQuery.set('');
  }

  // Card Reordering (relative to displayed list, persisted globally)
  getItemIndex(item: AgendaItem): number {
    return this.filteredItems().findIndex((i) => this.itemKey(i) === this.itemKey(item));
  }

  isFirst(item: AgendaItem): boolean {
    return this.getItemIndex(item) <= 0;
  }

  isLast(item: AgendaItem): boolean {
    const idx = this.getItemIndex(item);
    return idx < 0 || idx >= this.filteredItems().length - 1;
  }

  moveItemUp(item: AgendaItem): void {
    const displayedList = [...this.filteredItems()];
    const dispIdx = displayedList.findIndex((i) => this.itemKey(i) === this.itemKey(item));
    if (dispIdx <= 0) return;

    const prevItem = displayedList[dispIdx - 1];

    const currentList = [...this.orderedItems()];
    const itemIdx = currentList.findIndex((i) => this.itemKey(i) === this.itemKey(item));
    const prevIdx = currentList.findIndex((i) => this.itemKey(i) === this.itemKey(prevItem));
    if (itemIdx < 0 || prevIdx < 0) return;

    currentList[itemIdx] = prevItem;
    currentList[prevIdx] = item;

    const newOrder = currentList.map((i) => this.itemKey(i));
    this.customOrderIds.set(newOrder);
    this.saveRouteItemOrder(newOrder);
  }

  moveItemDown(item: AgendaItem): void {
    const displayedList = [...this.filteredItems()];
    const dispIdx = displayedList.findIndex((i) => this.itemKey(i) === this.itemKey(item));
    if (dispIdx < 0 || dispIdx >= displayedList.length - 1) return;

    const nextItem = displayedList[dispIdx + 1];

    const currentList = [...this.orderedItems()];
    const itemIdx = currentList.findIndex((i) => this.itemKey(i) === this.itemKey(item));
    const nextIdx = currentList.findIndex((i) => this.itemKey(i) === this.itemKey(nextItem));
    if (itemIdx < 0 || nextIdx < 0) return;

    currentList[itemIdx] = nextItem;
    currentList[nextIdx] = item;

    const newOrder = currentList.map((i) => this.itemKey(i));
    this.customOrderIds.set(newOrder);
    this.saveRouteItemOrder(newOrder);
  }

  private getOrderStorageKey(routeId?: string): string {
    const rId = routeId || this.filterForm.controls.routeId.value || 'default';
    return `cobroup_loan_order_${rId}`;
  }

  private loadRouteItemOrder(routeId?: string): string[] {
    try {
      const raw = localStorage.getItem(this.getOrderStorageKey(routeId));
      if (raw) {
        return JSON.parse(raw) as string[];
      }
    } catch {
      // ignore
    }
    return [];
  }

  private saveRouteItemOrder(order: string[], routeId?: string): void {
    try {
      localStorage.setItem(this.getOrderStorageKey(routeId), JSON.stringify(order));
    } catch {
      // ignore
    }
  }

  // Non-Payment modal workflows (persisted to Backend + local fallback)
  async openWillNotPayModal(item: AgendaItem): Promise<void> {
    this.targetWillNotPayItem.set(item);
    this.selectedReasonId.set('');
    this.customReasonName.set('');
    this.nonPaymentObservations.set('');
    this.isWillNotPayModalOpen.set(true);

    try {
      this.reasonsLoading.set(true);
      const reasons = await this.agendaService.getNonPaymentReasons(false);
      this.nonPaymentReasons.set(reasons);
      if (reasons.length > 0) {
        this.selectedReasonId.set(reasons[0].id);
      }
    } catch {
      // If reasons endpoint fails, fallback list is available
      this.nonPaymentReasons.set([
        { id: '1', name: 'Cliente ausente / viaje', isActive: true, displayOrder: 1 },
        { id: '2', name: 'Sin dinero / iliquidez', isActive: true, displayOrder: 2 },
        { id: '3', name: 'Comercio cerrado', isActive: true, displayOrder: 3 },
        { id: '4', name: 'Fecha postergada', isActive: true, displayOrder: 4 },
        { id: '5', name: 'Emergencia familiar', isActive: true, displayOrder: 5 },
        { id: 'custom', name: 'Otro motivo', isActive: true, displayOrder: 6 },
      ]);
      this.selectedReasonId.set('1');
    } finally {
      this.reasonsLoading.set(false);
    }
  }

  closeWillNotPayModal(): void {
    this.isWillNotPayModalOpen.set(false);
    this.targetWillNotPayItem.set(null);
  }

  async submitWillNotPay(): Promise<void> {
    const item = this.targetWillNotPayItem();
    if (!item) return;

    const date = this.filterForm.controls.date.value;
    const key = this.itemKey(item);
    const reasonId = this.selectedReasonId();
    const isCustom = reasonId === 'custom' || !reasonId;

    let reasonName = '';
    if (isCustom) {
      reasonName = this.customReasonName().trim() || 'No especificado';
    } else {
      const found = this.nonPaymentReasons().find((r) => r.id === reasonId);
      reasonName = found?.name || 'No pagará hoy';
    }

    try {
      this.submittingNonPayment.set(true);

      const request: RegisterWillNotPayRequest = {
        routeId: item.routeId,
        customerId: item.customerId,
        loanId: item.activeLoanId,
        businessDate: date,
        reasonId: isCustom ? null : reasonId,
        reasonName,
        observations: this.nonPaymentObservations().trim() || null,
      };

      await this.agendaService.registerWillNotPay(request);

      // Local optimistic update
      this.willNotPayTodayIds.update((set) => {
        const next = new Set(set);
        next.add(key);
        next.add(item.customerId);
        this.persistWillNotPayTodayIds(next, date);
        return next;
      });

      this.closeWillNotPayModal();
      this.success.set(`Se registró motivo de no pago: "${reasonName}".`);
      setTimeout(() => this.success.set(''), 3500);

      // Reload fresh data from backend
      await this.loadAgenda();
    } catch (err: unknown) {
      // Fallback local update if network issue
      this.willNotPayTodayIds.update((set) => {
        const next = new Set(set);
        next.add(key);
        next.add(item.customerId);
        this.persistWillNotPayTodayIds(next, date);
        return next;
      });
      this.closeWillNotPayModal();
      this.success.set(`Guardado localmente: "${reasonName}".`);
      setTimeout(() => this.success.set(''), 3500);
    } finally {
      this.submittingNonPayment.set(false);
    }
  }

  async unmarkWillNotPayToday(item: AgendaItem): Promise<void> {
    const date = this.filterForm.controls.date.value;
    const key = this.itemKey(item);

    try {
      this.loading.set(true);
      await this.agendaService.cancelWillNotPay(item.routeId, item.customerId, item.activeLoanId, date);

      this.willNotPayTodayIds.update((set) => {
        const next = new Set(set);
        next.delete(key);
        next.delete(item.customerId);
        this.persistWillNotPayTodayIds(next, date);
        return next;
      });

      this.success.set('Préstamo restablecido en la ruta de cobro.');
      setTimeout(() => this.success.set(''), 3500);
      await this.loadAgenda();
    } catch {
      // Fallback local removal
      this.willNotPayTodayIds.update((set) => {
        const next = new Set(set);
        next.delete(key);
        next.delete(item.customerId);
        this.persistWillNotPayTodayIds(next, date);
        return next;
      });
      this.success.set('Préstamo restablecido localmente.');
      setTimeout(() => this.success.set(''), 3500);
    } finally {
      this.loading.set(false);
    }
  }

  // Manage reasons
  toggleManageReasons(): void {
    this.isManageReasonsOpen.update((v) => !v);
  }

  async createNewReason(): Promise<void> {
    const name = this.newReasonName().trim();
    if (!name) return;

    try {
      this.savingNewReason.set(true);
      const created = await this.agendaService.createNonPaymentReason(name, this.newReasonDescription().trim() || undefined);
      this.nonPaymentReasons.update((list) => [...list, created]);
      this.selectedReasonId.set(created.id);
      this.newReasonName.set('');
      this.newReasonDescription.set('');
      this.isManageReasonsOpen.set(false);
    } catch (err: unknown) {
      this.error.set(err instanceof Error ? err.message : 'Error creando motivo.');
      setTimeout(() => this.error.set(''), 3500);
    } finally {
      this.savingNewReason.set(false);
    }
  }

  async toggleReasonStatus(reason: NonPaymentReason): Promise<void> {
    try {
      const updated = await this.agendaService.toggleNonPaymentReasonStatus(reason.id, !reason.isActive);
      this.nonPaymentReasons.update((list) =>
        list.map((r) => (r.id === updated.id ? { ...r, isActive: updated.isActive } : r))
      );
    } catch (err: unknown) {
      this.error.set(err instanceof Error ? err.message : 'Error actualizando estado del motivo.');
      setTimeout(() => this.error.set(''), 3500);
    }
  }

  private getDateKey(dateStr?: string): string {
    const date = dateStr || this.filterForm.controls.date.value || new Date().toISOString().substring(0, 10);
    return `cobroup_will_not_pay_${date}`;
  }

  private loadWillNotPayTodayIds(dateStr?: string): Set<string> {
    try {
      const key = this.getDateKey(dateStr);
      const raw = localStorage.getItem(key);
      if (raw) {
        const arr = JSON.parse(raw) as string[];
        return new Set(arr);
      }
    } catch {
      // ignore
    }
    return new Set<string>();
  }

  private persistWillNotPayTodayIds(ids: Set<string>, dateStr?: string): void {
    try {
      const key = this.getDateKey(dateStr);
      localStorage.setItem(key, JSON.stringify(Array.from(ids)));
    } catch {
      // ignore
    }
  }

  async openCollectModal(item: AgendaItem): Promise<void> {
    if (!item.activeLoanId) {
      this.goToCollect(item);
      return;
    }
    try {
      this.loading.set(true);
      const loan = await this.loansService.get(item.activeLoanId);
      this.payingLoan.set(loan);
      this.isPaymentModalOpen.set(true);
    } catch {
      this.goToCollect(item);
    } finally {
      this.loading.set(false);
    }
  }

  onPaymentModalClosed(): void {
    this.isPaymentModalOpen.set(false);
    this.payingLoan.set(null);
  }

  async onPaymentSuccess(_payment: PaymentDetails): Promise<void> {
    this.isPaymentModalOpen.set(false);
    this.payingLoan.set(null);
    this.success.set('Cobro registrado exitosamente.');
    setTimeout(() => this.success.set(''), 3500);
    await this.loadAgenda();
  }

  goToCollect(item: AgendaItem): void {
    if (item.activeLoanId) {
      void this.router.navigate(['/prestamos'], { queryParams: { loanId: item.activeLoanId } });
    } else {
      void this.router.navigate(['/clientes'], { queryParams: { customerId: item.customerId } });
    }
  }
}
