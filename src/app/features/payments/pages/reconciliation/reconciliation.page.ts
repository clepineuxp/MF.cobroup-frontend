import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RoutesService } from '../../../routes/data/routes.service';
import { AccessibleRoute } from '../../../routes/data/route.models';
import { DailyReconciliationReport } from '../../data/payment.models';
import { PaymentsService } from '../../data/payments.service';

@Component({
  selector: 'app-reconciliation-page',
  imports: [ReactiveFormsModule, CurrencyPipe, DecimalPipe],
  templateUrl: './reconciliation.page.html',
  styleUrl: './reconciliation.page.scss',
})
export class ReconciliationPage implements OnInit {
  private readonly paymentsService = inject(PaymentsService);
  private readonly routesService = inject(RoutesService);

  readonly routes = signal<readonly AccessibleRoute[]>([]);
  readonly report = signal<DailyReconciliationReport | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');

  readonly filterForm = new FormGroup({
    routeId: new FormControl<string>('', { nonNullable: true }),
    date: new FormControl<string>(new Date().toISOString().substring(0, 10), { nonNullable: true }),
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
        await this.loadReport();
      }
    } catch (err: unknown) {
      this.error.set(err instanceof Error ? err.message : 'Error cargando las rutas.');
    } finally {
      this.loading.set(false);
    }
  }

  async loadReport(): Promise<void> {
    const routeId = this.filterForm.controls.routeId.value;
    const date = this.filterForm.controls.date.value;
    if (!routeId) return;

    try {
      this.loading.set(true);
      this.error.set('');
      const data = await this.paymentsService.getDailyReconciliation(routeId, date);
      this.report.set(data);
    } catch (err: unknown) {
      this.error.set(err instanceof Error ? err.message : 'Error al consultar la conciliación.');
      this.report.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  calculatePercentage(amount: number, total: number): number {
    if (!total || total === 0) return 0;
    return (amount / total) * 100;
  }
}
