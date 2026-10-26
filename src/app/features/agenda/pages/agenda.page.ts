import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PaymentModalComponent } from '../../../shared/ui/payment-modal/payment-modal.component';
import { LoanDetails } from '../../loans/data/loan.models';
import { LoansService } from '../../loans/data/loans.service';
import { PaymentDetails } from '../../payments/data/payment.models';
import { AccessibleRoute } from '../../routes/data/route.models';
import { RoutesService } from '../../routes/data/routes.service';
import { AgendaItem, AgendaResponse, AgendaStatus } from '../data/agenda.models';
import { AgendaService } from '../data/agenda.service';

export type StatusFilter = 'PENDING' | 'OVERDUE' | 'DUE_TODAY' | 'WILL_NOT_PAY' | 'COLLECTED' | 'ALL';

@Component({
  selector: 'app-agenda-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CurrencyPipe, PaymentModalComponent],
  templateUrl: './agenda.page.html',
  styleUrl: './agenda.page.scss',
})
export class AgendaPage implements OnInit {
  private readonly agendaService = inject(AgendaService);
  private readonly routesService = inject(RoutesService);
  private readonly loansService = inject(LoansService);
  private readonly router = inject(Router);

  readonly routes = signal<readonly AccessibleRoute[]>([]);
  readonly agenda = signal<AgendaResponse | null>(null);
  readonly loading = signal(false);
  readonly optimizing = signal(false);
  readonly error = signal('');
  readonly success = signal('');
  readonly activeFilter = signal<StatusFilter>('PENDING');

  // Today loans metrics
  readonly totalLoanedToday = signal(0);
  readonly loanedCountToday = signal(0);

  // Daily "No pagará hoy" state (persisted per route date)
  readonly willNotPayTodayIds = signal<Set<string>>(new Set());

  // Payment modal state
  readonly isPaymentModalOpen = signal(false);
  readonly payingLoan = signal<LoanDetails | null>(null);

  readonly filterForm = new FormGroup({
    routeId: new FormControl<string>('', { nonNullable: true }),
    date: new FormControl<string>(new Date().toISOString().substring(0, 10), { nonNullable: true }),
  });

  effectiveStatus(item: AgendaItem): AgendaStatus {
    if (this.willNotPayTodayIds().has(item.customerId)) {
      return 'WillNotPayToday';
    }
    return item.status;
  }

  effectiveStatusLabel(item: AgendaItem): string {
    if (this.willNotPayTodayIds().has(item.customerId)) {
      return 'Hoy no pagará';
    }
    return item.statusLabel;
  }

  isPending(item: AgendaItem): boolean {
    const st = this.effectiveStatus(item);
    return st === 'DueToday' || st === 'Overdue';
  }

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

  readonly filteredItems = computed(() => {
    const resp = this.agenda();
    if (!resp) return [];
    const filter = this.activeFilter();
    switch (filter) {
      case 'PENDING':
        return resp.items.filter((i) => this.isPending(i));
      case 'OVERDUE':
        return resp.items.filter((i) => this.effectiveStatus(i) === 'Overdue');
      case 'DUE_TODAY':
        return resp.items.filter((i) => this.effectiveStatus(i) === 'DueToday');
      case 'WILL_NOT_PAY':
        return resp.items.filter((i) => this.effectiveStatus(i) === 'WillNotPayToday');
      case 'COLLECTED':
        return resp.items.filter((i) => this.effectiveStatus(i) === 'Collected');
      case 'ALL':
      default:
        return resp.items;
    }
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

      const [data, loansRes] = await Promise.all([
        this.agendaService.getAgenda(routeId, date),
        this.loansService.search(routeId, undefined, undefined, 1, 100).catch(() => ({ items: [] })),
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

  setFilter(filter: StatusFilter): void {
    this.activeFilter.set(filter);
  }

  markWillNotPayToday(customerId: string): void {
    const date = this.filterForm.controls.date.value;
    this.willNotPayTodayIds.update((set) => {
      const next = new Set(set);
      next.add(customerId);
      this.persistWillNotPayTodayIds(next, date);
      return next;
    });
    this.success.set('Cliente marcado: Hoy no pagará.');
    setTimeout(() => this.success.set(''), 3500);
  }

  unmarkWillNotPayToday(customerId: string): void {
    const date = this.filterForm.controls.date.value;
    this.willNotPayTodayIds.update((set) => {
      const next = new Set(set);
      next.delete(customerId);
      this.persistWillNotPayTodayIds(next, date);
      return next;
    });
    this.success.set('Cliente restablecido en la ruta de cobro.');
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

  async optimizeGps(): Promise<void> {
    if (!navigator.geolocation) {
      this.error.set('La geolocalización no está soportada en este navegador.');
      return;
    }

    this.optimizing.set(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const routeId = this.filterForm.controls.routeId.value;
          const date = this.filterForm.controls.date.value;
          const data = await this.agendaService.optimizeSequence(
            pos.coords.latitude,
            pos.coords.longitude,
            routeId,
            date,
          );
          this.agenda.set(data);
        } catch (err: unknown) {
          this.error.set(err instanceof Error ? err.message : 'Error al optimizar la ruta.');
        } finally {
          this.optimizing.set(false);
        }
      },
      (err) => {
        this.optimizing.set(false);
        this.error.set(`Permiso de ubicación denegado: ${err.message}`);
      },
      { timeout: 10000, enableHighAccuracy: true },
    );
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
