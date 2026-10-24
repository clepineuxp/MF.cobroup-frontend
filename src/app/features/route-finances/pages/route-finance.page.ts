import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { RoutesService } from '../../routes/data/routes.service';
import { AccessibleRoute } from '../../routes/data/route.models';
import { RouteBalance, RouteFinanceSection, RouteFinancialEntry, RouteFinancialEntryType, SaveRouteFinancialEntryRequest } from '../data/route-finance.models';
import { RouteFinancesService } from '../data/route-finances.service';

@Component({
  selector: 'app-route-finance-page',
  standalone: true,
  imports: [ReactiveFormsModule, CurrencyPipe, DatePipe],
  templateUrl: './route-finance.page.html',
  styleUrl: './route-finance.page.scss',
})
export class RouteFinancePage {
  private readonly route = inject(ActivatedRoute);
  private readonly routesService = inject(RoutesService);
  private readonly finances = inject(RouteFinancesService);
  readonly section = this.route.snapshot.data['section'] as RouteFinanceSection;
  readonly isExpense = this.section === 'expenses';
  readonly title = this.isExpense ? 'Gastos' : 'Ingresos e inversiones';
  readonly routes = signal<readonly AccessibleRoute[]>([]);
  readonly selectedRouteId = signal('');
  readonly balance = signal<RouteBalance | null>(null);
  readonly entries = signal<readonly RouteFinancialEntry[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly success = signal('');
  readonly editingId = signal<string | null>(null);
  readonly selectedRoute = computed(() => this.routes().find(item => item.id === this.selectedRouteId()) ?? null);
  readonly form = new FormGroup({
    type: new FormControl<RouteFinancialEntryType>(this.isExpense ? 'Expense' : 'Income', { nonNullable: true }),
    concept: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(160)] }),
    description: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(1000)] }),
    amount: new FormControl<number | null>(null, { validators: [Validators.required, Validators.min(0.01)] }),
  });

  constructor() { void this.loadRoutes(); }

  async selectRoute(routeId: string): Promise<void> {
    this.selectedRouteId.set(routeId); this.cancelEdit(); this.error.set(''); this.success.set('');
    if (!routeId) { this.balance.set(null); this.entries.set([]); return; }
    await this.reload();
  }

  edit(entry: RouteFinancialEntry): void {
    if (!entry.canEdit || this.saving()) return;
    this.editingId.set(entry.id);
    this.form.reset({ type: entry.type, concept: entry.concept, description: entry.description ?? '', amount: entry.amount });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.form.reset({ type: this.isExpense ? 'Expense' : 'Income', concept: '', description: '', amount: null });
  }

  async submit(): Promise<void> {
    if (this.form.invalid || !this.selectedRouteId() || this.saving()) { this.form.markAllAsTouched(); return; }
    this.saving.set(true); this.error.set(''); this.success.set('');
    try {
      const value = this.form.getRawValue();
      const request: SaveRouteFinancialEntryRequest = {
        routeId: this.selectedRouteId(), type: this.isExpense ? 'Expense' : value.type,
        concept: value.concept.trim(), description: value.description.trim() || null, amount: value.amount!,
      };
      const editingId = this.editingId();
      if (editingId) await this.finances.update(editingId, request);
      else await this.finances.create(request);
      this.success.set(editingId ? 'Movimiento actualizado.' : 'Movimiento registrado.');
      this.cancelEdit(); await this.reload();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No fue posible guardar el movimiento.');
    } finally { this.saving.set(false); }
  }

  private async loadRoutes(): Promise<void> {
    this.loading.set(true);
    try {
      const routes = await this.routesService.listAccessible(); this.routes.set(routes);
      if (routes.length) { this.selectedRouteId.set(routes[0].id); await this.reload(); }
    } catch (error) { this.error.set(error instanceof Error ? error.message : 'No fue posible cargar las rutas.'); }
    finally { this.loading.set(false); }
  }

  private async reload(): Promise<void> {
    const routeId = this.selectedRouteId(); if (!routeId) return;
    const [balance, entries] = await Promise.all([
      this.finances.getBalance(routeId), this.finances.listEntries(routeId, this.section)
    ]);
    this.balance.set(balance); this.entries.set(entries);
  }
}
