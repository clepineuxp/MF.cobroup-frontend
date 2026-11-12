import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
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
import { AgendaItem, AgendaResponse, AgendaStatus } from '../data/agenda.models';
import { AgendaService } from '../data/agenda.service';

export type StatusFilter = 'ALL' | 'PENDING' | 'OVERDUE' | 'DUE_TODAY' | 'WILL_NOT_PAY' | 'COLLECTED';

@Component({
  selector: 'app-agenda-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CurrencyPipe, PaymentModalComponent, AppIconComponent],
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
  readonly activeFilter = signal<StatusFilter>('PENDING');
  readonly searchQuery = signal('');

  // Metrics
  readonly totalLoanedToday = signal(0);
  readonly loanedCountToday = signal(0);

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
    const key = this.itemKey(item);
    if (this.willNotPayTodayIds().has(key) || this.willNotPayTodayIds().has(item.customerId)) {
      return 'WillNotPayToday';
    }
    return item.status;
  }

  effectiveStatusLabel(item: AgendaItem): string {
    const key = this.itemKey(item);
    if (this.willNotPayTodayIds().has(key) || this.willNotPayTodayIds().has(item.customerId)) {
      return 'Hoy no pagará';
    }
    return item.statusLabel;
  }

  isPending(item: AgendaItem): boolean {
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

  // Filter counts
  readonly allCount = computed(() => {
    return this.agenda()?.items?.length ?? 0;
  });

  readonly pendingCount = computed(() => {
    const items = this.agenda()?.items ?? [];
    return items.filter((i) => this.isPending(i)).length;
  });

  readonly overdueCount = computed(() => {
    const items = this.agenda()?.items ?? [];
    return items.filter((i) => this.effectiveStatus(i) === 'Overdue').length;
  });

  readonly dueTodayCount = computed(() => {
    const items = this.agenda()?.items ?? [];
    return items.filter((i) => this.effectiveStatus(i) === 'DueToday').length;
  });

  readonly willNotPayCount = computed(() => {
    const items = this.agenda()?.items ?? [];
    return items.filter((i) => this.effectiveStatus(i) === 'WillNotPayToday').length;
  });

  readonly collectedCount = computed(() => {
    const items = this.agenda()?.items ?? [];
    return items.filter((i) => this.effectiveStatus(i) === 'Collected').length;
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

  // Filtered by status tab
  readonly filteredByStatusItems = computed(() => {
    const items = this.orderedItems();
    const filter = this.activeFilter();
    switch (filter) {
      case 'PENDING':
        return items.filter((i) => this.isPending(i));
      case 'OVERDUE':
        return items.filter((i) => this.effectiveStatus(i) === 'Overdue');
      case 'DUE_TODAY':
        return items.filter((i) => this.effectiveStatus(i) === 'DueToday');
      case 'WILL_NOT_PAY':
        return items.filter((i) => this.effectiveStatus(i) === 'WillNotPayToday');
      case 'COLLECTED':
        return items.filter((i) => this.effectiveStatus(i) === 'Collected');
      case 'ALL':
      default:
        return items;
    }
  });

  // Filtered items (status tab + search query)
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

  setFilter(filter: StatusFilter): void {
    this.activeFilter.set(filter);
  }

  onSearchInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.searchQuery.set(val);
  }

  clearSearch(): void {
    this.searchQuery.set('');
  }

  // Card Reordering
  getItemIndex(item: AgendaItem): number {
    return this.orderedItems().findIndex((i) => this.itemKey(i) === this.itemKey(item));
  }

  isFirst(item: AgendaItem): boolean {
    return this.getItemIndex(item) <= 0;
  }

  isLast(item: AgendaItem): boolean {
    const idx = this.getItemIndex(item);
    return idx < 0 || idx >= this.orderedItems().length - 1;
  }

  moveItemUp(item: AgendaItem): void {
    const currentList = [...this.orderedItems()];
    const idx = currentList.findIndex((i) => this.itemKey(i) === this.itemKey(item));
    if (idx <= 0) return;

    const prevItem = currentList[idx - 1];
    currentList[idx - 1] = item;
    currentList[idx] = prevItem;

    const newOrder = currentList.map((i) => this.itemKey(i));
    this.customOrderIds.set(newOrder);
    this.saveRouteItemOrder(newOrder);
  }

  moveItemDown(item: AgendaItem): void {
    const currentList = [...this.orderedItems()];
    const idx = currentList.findIndex((i) => this.itemKey(i) === this.itemKey(item));
    if (idx < 0 || idx >= currentList.length - 1) return;

    const nextItem = currentList[idx + 1];
    currentList[idx + 1] = item;
    currentList[idx] = nextItem;

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

  markWillNotPayToday(item: AgendaItem): void {
    const date = this.filterForm.controls.date.value;
    const key = this.itemKey(item);
    this.willNotPayTodayIds.update((set) => {
      const next = new Set(set);
      next.add(key);
      next.add(item.customerId);
      this.persistWillNotPayTodayIds(next, date);
      return next;
    });
    this.success.set('Préstamo marcado: Hoy no pagará.');
    setTimeout(() => this.success.set(''), 3500);
  }

  unmarkWillNotPayToday(item: AgendaItem): void {
    const date = this.filterForm.controls.date.value;
    const key = this.itemKey(item);
    this.willNotPayTodayIds.update((set) => {
      const next = new Set(set);
      next.delete(key);
      next.delete(item.customerId);
      this.persistWillNotPayTodayIds(next, date);
      return next;
    });
    this.success.set('Préstamo restablecido en la ruta de cobro.');
    setTimeout(() => this.success.set(''), 3500);
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
