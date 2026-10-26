import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, OnInit, inject, signal, computed, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { AppIconComponent } from '../../../shared/ui/app-icon/app-icon.component';
import { MapPoint, MapViewComponent } from '../../../shared/ui/map-view/map-view.component';
import { AccessibleRoute } from '../../routes/data/route.models';
import { RoutesService } from '../../routes/data/routes.service';
import { RouteBalance } from '../../route-finances/data/route-finance.models';
import { RouteFinancesService } from '../../route-finances/data/route-finances.service';
import { AgendaStatus, CustomerMapLocation } from '../data/agenda.models';
import { AgendaService } from '../data/agenda.service';
import { LoansService } from '../../loans/data/loans.service';
import { LoanDetails } from '../../loans/data/loan.models';
import { PaymentDetails } from '../../payments/data/payment.models';
import { CustomerModalComponent } from '../../../shared/ui/customer-modal/customer-modal.component';
import { LoanOriginationModalComponent } from '../../../shared/ui/loan-origination-modal/loan-origination-modal.component';
import { PaymentModalComponent } from '../../../shared/ui/payment-modal/payment-modal.component';

export type MapStatusFilter = 'PENDING' | 'OVERDUE' | 'DUE' | 'WILL_NOT_PAY' | 'COLLECTED' | 'ALL';

@Component({
  selector: 'app-mapa-page',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    AppIconComponent,
    MapViewComponent,
    CustomerModalComponent,
    LoanOriginationModalComponent,
    PaymentModalComponent,
  ],
  templateUrl: './mapa.page.html',
  styleUrl: './mapa.page.scss',
})
export class MapaPage implements OnInit {
  private readonly router = inject(Router);
  private readonly agendaService = inject(AgendaService);
  private readonly routesService = inject(RoutesService);
  private readonly loansService = inject(LoansService);
  private readonly routeFinancesService = inject(RouteFinancesService);

  readonly routes = signal<readonly AccessibleRoute[]>([]);
  readonly selectedRouteId = signal<string>('');
  readonly routeBalance = signal<RouteBalance | null>(null);
  readonly balanceLoading = signal(false);
  readonly isBalanceHidden = signal<boolean>(this.getStoredBalanceHidden());
  readonly rawLocations = signal<readonly CustomerMapLocation[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly success = signal('');

  readonly selectedPoint = signal<MapPoint | null>(null);
  readonly selectedCustomerLoan = signal<LoanDetails | null>(null);
  readonly statusFilter = signal<MapStatusFilter>('PENDING');
  readonly willNotPayTodayIds = signal<Set<string>>(this.loadWillNotPayTodayIds());

  readonly filterMenuOpen = signal(false);
  readonly routeMenuOpen = signal(false);

  // Shared Modals State
  readonly isOriginationModalOpen = signal(false);
  readonly isCustomerModalOpen = signal(false);
  readonly isPaymentModalOpen = signal(false);
  readonly payingLoan = signal<LoanDetails | null>(null);

  readonly selectedRouteName = computed(() => {
    const id = this.selectedRouteId();
    return this.routes().find((r) => r.id === id)?.name ?? 'Seleccionar ruta';
  });

  readonly canCollect = computed(() => {
    return !!this.selectedPoint() && !!this.selectedCustomerLoan();
  });

  readonly pendingCount = computed(() => {
    const willNotPay = this.willNotPayTodayIds();
    return this.rawLocations().filter(
      (l) => !willNotPay.has(l.customerId) && (l.status === 'Overdue' || l.status === 'DueToday')
    ).length;
  });

  readonly moraCount = computed(() => {
    const willNotPay = this.willNotPayTodayIds();
    return this.rawLocations().filter(
      (l) => !willNotPay.has(l.customerId) && l.status === 'Overdue'
    ).length;
  });

  readonly dueCount = computed(() => {
    const willNotPay = this.willNotPayTodayIds();
    return this.rawLocations().filter(
      (l) => !willNotPay.has(l.customerId) && l.status === 'DueToday'
    ).length;
  });

  readonly willNotPayCount = computed(() => {
    const willNotPay = this.willNotPayTodayIds();
    return this.rawLocations().filter((l) => willNotPay.has(l.customerId)).length;
  });

  readonly collectedCount = computed(() => {
    const willNotPay = this.willNotPayTodayIds();
    return this.rawLocations().filter(
      (l) => !willNotPay.has(l.customerId) && l.status === 'Collected'
    ).length;
  });

  readonly allCount = computed(() => this.rawLocations().length);

  readonly mapPoints = computed<MapPoint[]>(() => {
    const list = this.rawLocations();
    const filter = this.statusFilter();
    const willNotPay = this.willNotPayTodayIds();

    return list
      .map((loc) => {
        const isWillNotPay = willNotPay.has(loc.customerId);
        return {
          ...loc,
          status: (isWillNotPay ? 'WillNotPayToday' : loc.status) as AgendaStatus,
          markerColor: isWillNotPay ? '#94A3B8' : loc.markerColor,
        };
      })
      .filter((loc) => {
        const isWillNotPay = willNotPay.has(loc.customerId);

        if (filter === 'PENDING') {
          // Initial / Default view: ONLY customers with DueToday or Overdue, excluding WillNotPayToday, Collected, UpToDate
          if (isWillNotPay) return false;
          return loc.status === 'Overdue' || loc.status === 'DueToday';
        }
        if (filter === 'OVERDUE') {
          if (isWillNotPay) return false;
          return loc.status === 'Overdue';
        }
        if (filter === 'DUE') {
          if (isWillNotPay) return false;
          return loc.status === 'DueToday';
        }
        if (filter === 'WILL_NOT_PAY') {
          return isWillNotPay;
        }
        if (filter === 'COLLECTED') {
          if (isWillNotPay) return false;
          return loc.status === 'Collected';
        }
        if (filter === 'ALL') {
          return true;
        }
        return true;
      })
      .map((loc) => ({
        customerId: loc.customerId,
        customerName: loc.customerName,
        businessOrWorkName: loc.businessOrWorkName,
        address: loc.address,
        latitude: loc.latitude,
        longitude: loc.longitude,
        status: loc.status,
        markerColor: loc.markerColor,
        dueTodayAmount: loc.dueTodayAmount,
        overdueAmount: loc.overdueAmount,
        loanBalance: loc.loanBalance,
        avatarUrl: loc.avatarUrl ?? null,
      }));
  });

  async ngOnInit(): Promise<void> {
    if (this.routes().length === 0) {
      await this.loadRoutes();
    }
  }

  async loadRoutes(): Promise<void> {
    try {
      this.loading.set(true);
      const accessibleRoutes = await this.routesService.listAccessible();
      this.routes.set(accessibleRoutes);

      // Requirement 2.5.1: Automatically select first route in list
      if (accessibleRoutes.length > 0) {
        this.selectedRouteId.set(accessibleRoutes[0].id);
        await Promise.all([
          this.loadMapLocations(accessibleRoutes[0].id),
          this.loadRouteBalance(accessibleRoutes[0].id),
        ]);
      }
    } catch (err: unknown) {
      this.error.set(err instanceof Error ? err.message : 'Error cargando las rutas.');
    } finally {
      this.loading.set(false);
    }
  }

  async selectRoute(routeId: string): Promise<void> {
    this.selectedRouteId.set(routeId);
    this.routeMenuOpen.set(false);
    await Promise.all([
      this.loadMapLocations(routeId),
      this.loadRouteBalance(routeId),
    ]);
  }

  async loadRouteBalance(routeId?: string): Promise<void> {
    const targetRouteId = routeId || this.selectedRouteId();
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

  toggleBalanceVisibility(event: Event): void {
    event.stopPropagation();
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

  readonly summaryPopoverOpen = signal(false);

  toggleSummaryPopover(event?: Event): void {
    event?.stopPropagation();
    this.summaryPopoverOpen.update((v) => !v);
  }

  closeSummaryPopover(): void {
    this.summaryPopoverOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target?.closest('.floating-balance-bubble')) {
      this.closeSummaryPopover();
    }
  }

  onBubbleBlur(event: FocusEvent): void {
    const related = event.relatedTarget as HTMLElement | null;
    if (!related?.closest('.floating-balance-bubble')) {
      this.closeSummaryPopover();
    }
  }

  goToBalanceSummary(): void {
    this.closeSummaryPopover();
    const routeId = this.selectedRouteId();
    void this.router.navigate(['/balance-ruta'], {
      queryParams: routeId ? { routeId } : undefined,
    });
  }

  private getStoredBalanceHidden(): boolean {
    try {
      return localStorage.getItem('cobroup_hide_balance') === 'true';
    } catch {
      return false;
    }
  }

  async loadMapLocations(routeId?: string): Promise<void> {
    const targetRouteId = routeId || this.selectedRouteId();
    if (!targetRouteId) return;

    try {
      this.loading.set(true);
      this.error.set('');
      // Requirement 2.5.3: date picker removed, agendaService defaults to current date/overview
      const data = await this.agendaService.getMapLocations(targetRouteId);
      this.rawLocations.set(data);
      this.selectedPoint.set(null);
      this.selectedCustomerLoan.set(null);
    } catch (err: unknown) {
      this.error.set(err instanceof Error ? err.message : 'Error al consultar puntos del mapa.');
    } finally {
      this.loading.set(false);
    }
  }

  async onPointSelected(point: MapPoint): Promise<void> {
    this.selectedPoint.set(point);
    this.selectedCustomerLoan.set(null);

    const raw = this.rawLocations().find((l) => l.customerId === point.customerId);
    if (raw?.activeLoanId) {
      try {
        const loan = await this.loansService.get(raw.activeLoanId);
        this.selectedCustomerLoan.set(loan);
      } catch {
        this.selectedCustomerLoan.set(null);
      }
    } else {
      try {
        const loans = await this.loansService.listByCustomer(point.customerId);
        const active = loans.find((l) => l.status === 'Active') ?? null;
        this.selectedCustomerLoan.set(active);
      } catch {
        this.selectedCustomerLoan.set(null);
      }
    }
  }

  closeInspector(): void {
    this.selectedPoint.set(null);
    this.selectedCustomerLoan.set(null);
  }

  markWillNotPayToday(customerId: string): void {
    this.willNotPayTodayIds.update((set) => {
      const next = new Set(set);
      next.add(customerId);
      this.persistWillNotPayTodayIds(next);
      return next;
    });
    this.selectedPoint.set(null);
    this.selectedCustomerLoan.set(null);
    this.success.set('Cliente marcado: Hoy no pagará.');
    setTimeout(() => this.success.set(''), 3500);
  }

  unmarkWillNotPayToday(customerId: string): void {
    this.willNotPayTodayIds.update((set) => {
      const next = new Set(set);
      next.delete(customerId);
      this.persistWillNotPayTodayIds(next);
      return next;
    });
    this.success.set('Cliente restablecido en la ruta de cobro.');
    setTimeout(() => this.success.set(''), 3500);
  }

  isCustomerMarkedWillNotPay(customerId: string): boolean {
    return this.willNotPayTodayIds().has(customerId);
  }

  private getTodayDateKey(): string {
    const today = new Date();
    return `cobroup_will_not_pay_${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  }

  private loadWillNotPayTodayIds(): Set<string> {
    try {
      const key = this.getTodayDateKey();
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

  private persistWillNotPayTodayIds(ids: Set<string>): void {
    try {
      const key = this.getTodayDateKey();
      localStorage.setItem(key, JSON.stringify(Array.from(ids)));
    } catch {
      // ignore
    }
  }

  setFilter(filter: MapStatusFilter): void {
    this.statusFilter.set(filter);
    this.filterMenuOpen.set(false);
  }

  toggleFilterMenu(): void {
    this.filterMenuOpen.update((v) => !v);
  }

  toggleRouteMenu(): void {
    this.routeMenuOpen.update((v) => !v);
  }

  // --- Actions ---

  openNewLoan(): void {
    this.isOriginationModalOpen.set(true);
  }

  openCollect(): void {
    const loan = this.selectedCustomerLoan();
    if (loan) {
      this.payingLoan.set(loan);
      this.isPaymentModalOpen.set(true);
    }
  }

  openNewCustomer(): void {
    this.isCustomerModalOpen.set(true);
  }

  async onLoanCreated(_loan: LoanDetails): Promise<void> {
    this.success.set('Préstamo originado exitosamente.');
    setTimeout(() => this.success.set(''), 4000);
    await Promise.all([
      this.loadMapLocations(),
      this.loadRouteBalance(),
    ]);
  }

  async onCustomerSaved(_customerId: string): Promise<void> {
    this.success.set('Cliente registrado exitosamente.');
    setTimeout(() => this.success.set(''), 4000);
    await this.loadMapLocations();
  }

  async onPaymentSuccess(_payment: PaymentDetails): Promise<void> {
    this.success.set('Cobro registrado exitosamente.');
    setTimeout(() => this.success.set(''), 4000);
    await Promise.all([
      this.loadMapLocations(),
      this.loadRouteBalance(),
    ]);
  }

  getCustomerInitials(name: string): string {
    if (!name) return 'C';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  }

  onAvatarImgError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    const sibling = img.nextElementSibling as HTMLElement;
    if (sibling) {
      sibling.style.display = 'flex';
    }
  }
}
