import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { MapPoint, MapViewComponent } from '../../../shared/ui/map-view/map-view.component';
import { AccessibleRoute } from '../../routes/data/route.models';
import { RoutesService } from '../../routes/data/routes.service';
import { CustomerMapLocation } from '../data/agenda.models';
import { AgendaService } from '../data/agenda.service';
import { LoansService } from '../../loans/data/loans.service';
import { LoanDetails } from '../../loans/data/loan.models';
import { PaymentDetails } from '../../payments/data/payment.models';
import { CustomerModalComponent } from '../../../shared/ui/customer-modal/customer-modal.component';
import { LoanOriginationModalComponent } from '../../../shared/ui/loan-origination-modal/loan-origination-modal.component';
import { PaymentModalComponent } from '../../../shared/ui/payment-modal/payment-modal.component';

@Component({
  selector: 'app-mapa-page',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    MapViewComponent,
    CustomerModalComponent,
    LoanOriginationModalComponent,
    PaymentModalComponent,
  ],
  templateUrl: './mapa.page.html',
  styleUrl: './mapa.page.scss',
})
export class MapaPage implements OnInit {
  private readonly agendaService = inject(AgendaService);
  private readonly routesService = inject(RoutesService);
  private readonly loansService = inject(LoansService);

  readonly routes = signal<readonly AccessibleRoute[]>([]);
  readonly selectedRouteId = signal<string>('');
  readonly rawLocations = signal<readonly CustomerMapLocation[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly success = signal('');

  readonly selectedPoint = signal<MapPoint | null>(null);
  readonly selectedCustomerLoan = signal<LoanDetails | null>(null);
  readonly statusFilter = signal<'ALL' | 'OVERDUE' | 'DUE' | 'COLLECTED'>('ALL');

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

  readonly moraCount = computed(() => this.rawLocations().filter((l) => l.status === 'Overdue').length);
  readonly dueCount = computed(() => this.rawLocations().filter((l) => l.status === 'DueToday').length);
  readonly collectedCount = computed(() => this.rawLocations().filter((l) => l.status === 'Collected').length);

  readonly mapPoints = computed<MapPoint[]>(() => {
    const list = this.rawLocations();
    const filter = this.statusFilter();

    return list
      .filter((loc) => {
        if (filter === 'OVERDUE') return loc.status === 'Overdue';
        if (filter === 'DUE') return loc.status === 'DueToday';
        if (filter === 'COLLECTED') return loc.status === 'Collected';
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
        await this.loadMapLocations(accessibleRoutes[0].id);
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
    await this.loadMapLocations(routeId);
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

  setFilter(filter: 'ALL' | 'OVERDUE' | 'DUE' | 'COLLECTED'): void {
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
    await this.loadMapLocations();
  }

  async onCustomerSaved(_customerId: string): Promise<void> {
    this.success.set('Cliente registrado exitosamente.');
    setTimeout(() => this.success.set(''), 4000);
    await this.loadMapLocations();
  }

  async onPaymentSuccess(_payment: PaymentDetails): Promise<void> {
    this.success.set('Cobro registrado exitosamente.');
    setTimeout(() => this.success.set(''), 4000);
    await this.loadMapLocations();
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
