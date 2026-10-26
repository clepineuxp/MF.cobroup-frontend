import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AppIconComponent } from '../../../shared/ui/app-icon/app-icon.component';
import { LoansService } from '../../loans/data/loans.service';
import { PaymentsService } from '../../payments/data/payments.service';
import { AccessibleRoute } from '../../routes/data/route.models';
import { RoutesService } from '../../routes/data/routes.service';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import {
  RouteBalance,
  RouteDayClosingStatus,
  RouteFinancialEntry,
  RouteFinancialEntryType,
  SaveRouteFinancialEntryRequest,
} from '../data/route-finance.models';
import { RouteFinancesService } from '../data/route-finances.service';

export type FilterPeriod = 'daily' | 'weekly' | 'monthly';

export interface FinancialMovementItem {
  readonly id: string;
  readonly routeId: string;
  readonly routeName?: string;
  readonly section: 'income' | 'expense';
  readonly badge: string;
  readonly badgeClass: 'income' | 'investment' | 'expense' | 'payment' | 'loan';
  readonly concept: string;
  readonly description?: string | null;
  readonly amount: number;
  readonly date: Date;
  readonly createdBy?: string;
  readonly canEdit: boolean;
  readonly canDelete?: boolean;
  readonly rawEntry?: RouteFinancialEntry;
}

export interface DayButton {
  readonly date: Date;
  readonly dayNumber: number;
  readonly dayName: string;
  readonly isToday: boolean;
  readonly isSelected: boolean;
}

@Component({
  selector: 'app-route-finance-page',
  standalone: true,
  imports: [ReactiveFormsModule, CurrencyPipe, DatePipe, AppIconComponent],
  templateUrl: './route-finance.page.html',
  styleUrl: './route-finance.page.scss',
})
export class RouteFinancePage {
  private readonly routesService = inject(RoutesService);
  private readonly finances = inject(RouteFinancesService);
  private readonly loansService = inject(LoansService);
  private readonly paymentsService = inject(PaymentsService);
  private readonly route = inject(ActivatedRoute, { optional: true });

  // Routes & Selection: Empty string means "Todas las rutas (General)"
  readonly routes = signal<readonly AccessibleRoute[]>([]);
  readonly selectedRouteId = signal<string>('');
  readonly balance = signal<RouteBalance | null>(null);

  // Day Closing State
  readonly auth = inject(AuthService);
  readonly dayClosing = signal<RouteDayClosingStatus | null>(null);
  readonly isDayClosed = computed(() => this.dayClosing()?.isClosed ?? false);
  readonly canReopenDay = computed(() => this.auth.canReopenDay() || (this.dayClosing()?.canReopen ?? false));
  readonly closingInProgress = signal(false);

  // Tab State: Siempre se muestra primero los ingresos
  readonly activeTab = signal<'income' | 'expense'>('income');

  // Period & Date Filter State
  readonly periodType = signal<FilterPeriod>('daily');
  readonly selectedDate = signal<Date>(new Date());

  // Raw Movements
  readonly movements = signal<readonly FinancialMovementItem[]>([]);

  // Loading & Feedback
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly success = signal('');

  // Modal State
  readonly isModalOpen = signal(false);
  readonly modalSection = signal<'income' | 'expense'>('income');
  readonly modalMode = signal<'create' | 'edit'>('create');
  readonly editingEntry = signal<RouteFinancialEntry | null>(null);
  readonly modalError = signal('');

  readonly modalForm = new FormGroup({
    targetRouteId: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    type: new FormControl<RouteFinancialEntryType>('Income', { nonNullable: true }),
    concept: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(160)],
    }),
    description: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(1000)],
    }),
    amount: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(0.01)],
    }),
  });

  // Computed: Selected route name
  readonly selectedRoute = computed(() => {
    const id = this.selectedRouteId();
    if (!id) return null;
    return this.routes().find((r) => r.id === id) ?? null;
  });

  readonly isGeneralView = computed(() => !this.selectedRouteId());

  // Computed: Filter movements by period & date
  readonly filteredMovements = computed(() => {
    const all = this.movements();
    const period = this.periodType();
    const target = this.selectedDate();

    return all.filter((item) => {
      const itemDate = item.date;
      if (period === 'daily') {
        return (
          itemDate.getFullYear() === target.getFullYear() &&
          itemDate.getMonth() === target.getMonth() &&
          itemDate.getDate() === target.getDate()
        );
      }
      if (period === 'weekly') {
        const start = this.getStartOfWeek(target);
        const end = this.getEndOfWeek(target);
        return itemDate >= start && itemDate <= end;
      }
      if (period === 'monthly') {
        return (
          itemDate.getFullYear() === target.getFullYear() &&
          itemDate.getMonth() === target.getMonth()
        );
      }
      return true;
    });
  });

  // Filtered by active tab
  readonly tabMovements = computed(() => {
    const section = this.activeTab();
    return this.filteredMovements().filter((m) => m.section === section);
  });

  // Últimos 10 movimientos del tab actual para el periodo
  readonly recentTabMovements = computed(() => this.tabMovements().slice(0, 10));

  // Counts for tab badges
  readonly incomeCount = computed(
    () => this.filteredMovements().filter((m) => m.section === 'income').length
  );
  readonly expenseCount = computed(
    () => this.filteredMovements().filter((m) => m.section === 'expense').length
  );

  // Description of currently viewed period
  readonly viewingText = computed(() => {
    const target = this.selectedDate();
    const period = this.periodType();
    const months = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];
    const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

    if (period === 'daily') {
      const isToday = this.isSameDay(target, new Date());
      const dayName = days[target.getDay()];
      const prefix = isToday ? 'Hoy, ' : '';
      return `${prefix}${dayName} ${target.getDate()} de ${months[target.getMonth()]} de ${target.getFullYear()}`;
    }

    if (period === 'weekly') {
      const start = this.getStartOfWeek(target);
      const end = this.getEndOfWeek(target);
      return `Semana del ${start.getDate()} ${months[start.getMonth()].slice(0, 3)} al ${end.getDate()} ${months[end.getMonth()].slice(0, 3)} ${target.getFullYear()}`;
    }

    return `Mes de ${months[target.getMonth()]} de ${target.getFullYear()}`;
  });

  // Day buttons strip for daily selector: 7 days of the week around selectedDate
  readonly dayButtons = computed<readonly DayButton[]>(() => {
    const target = this.selectedDate();
    const start = this.getStartOfWeek(target);
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const today = new Date();
    const result: DayButton[] = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      result.push({
        date: d,
        dayNumber: d.getDate(),
        dayName: dayNames[d.getDay()],
        isToday: this.isSameDay(d, today),
        isSelected: this.isSameDay(d, target),
      });
    }

    return result;
  });

  constructor() {
    void this.loadRoutes();
  }

  async selectRoute(routeId: string): Promise<void> {
    this.selectedRouteId.set(routeId);
    this.closeModal();
    this.error.set('');
    this.success.set('');
    await this.reload();
  }

  setTab(tab: 'income' | 'expense'): void {
    this.activeTab.set(tab);
  }

  setPeriod(period: FilterPeriod): void {
    this.periodType.set(period);
  }

  selectDay(date: Date): void {
    this.selectedDate.set(new Date(date));
  }

  navigatePeriod(direction: -1 | 1): void {
    const curr = new Date(this.selectedDate());
    const period = this.periodType();

    if (period === 'daily') {
      curr.setDate(curr.getDate() + direction);
    } else if (period === 'weekly') {
      curr.setDate(curr.getDate() + direction * 7);
    } else if (period === 'monthly') {
      curr.setMonth(curr.getMonth() + direction);
    }
    this.selectedDate.set(curr);
  }

  openCreateModal(section: 'income' | 'expense'): void {
    if (this.saving()) return;
    this.modalSection.set(section);
    this.modalMode.set('create');
    this.editingEntry.set(null);
    this.modalError.set('');

    const targetRoute = this.selectedRouteId() || (this.routes().length ? this.routes()[0].id : '');
    this.modalForm.reset({
      targetRouteId: targetRoute,
      type: section === 'expense' ? 'Expense' : 'Income',
      concept: '',
      description: '',
      amount: null,
    });
    this.isModalOpen.set(true);
  }

  openEditModal(entry: RouteFinancialEntry): void {
    if (!entry.canEdit || this.saving()) return;
    const section = entry.type === 'Expense' ? 'expense' : 'income';
    this.modalSection.set(section);
    this.modalMode.set('edit');
    this.editingEntry.set(entry);
    this.modalError.set('');
    this.modalForm.reset({
      targetRouteId: entry.routeId,
      type: entry.type,
      concept: entry.concept,
      description: entry.description ?? '',
      amount: entry.amount,
    });
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    if (this.saving()) return;
    this.isModalOpen.set(false);
    this.editingEntry.set(null);
    this.modalError.set('');
  }

  async submitModal(): Promise<void> {
    if (this.modalForm.invalid || this.saving()) {
      this.modalForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.modalError.set('');
    this.error.set('');
    this.success.set('');

    try {
      const formValue = this.modalForm.getRawValue();
      const isExpense = this.modalSection() === 'expense';
      const request: SaveRouteFinancialEntryRequest = {
        routeId: formValue.targetRouteId,
        type: isExpense ? 'Expense' : formValue.type,
        concept: formValue.concept.trim(),
        description: formValue.description.trim() || null,
        amount: formValue.amount!,
      };

      const editing = this.editingEntry();
      if (editing) {
        await this.finances.update(editing.id, request);
        this.success.set('Movimiento actualizado con éxito.');
      } else {
        await this.finances.create(request);
        this.success.set(
          isExpense ? 'Gasto registrado con éxito.' : 'Ingreso registrado con éxito.'
        );
      }

      this.isModalOpen.set(false);
      this.editingEntry.set(null);
      this.modalError.set('');
      await this.reload();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No fue posible guardar el movimiento.';
      this.modalError.set(msg);
    } finally {
      this.saving.set(false);
    }
  }

  async closeDay(): Promise<void> {
    const routeId = this.selectedRouteId();
    if (!routeId || this.isDayClosed()) return;
    if (!confirm('¿Deseas cerrar el día para esta ruta? Al cerrar el día, no se podrán realizar cobros, préstamos, ingresos ni gastos hasta el día siguiente.')) {
      return;
    }
    this.closingInProgress.set(true);
    this.error.set('');
    try {
      const status = await this.finances.closeDay(routeId);
      this.dayClosing.set(status);
      this.success.set('Día cerrado exitosamente.');
      await this.reload();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'No fue posible cerrar el día.');
    } finally {
      this.closingInProgress.set(false);
    }
  }

  async reopenDay(): Promise<void> {
    const routeId = this.selectedRouteId();
    if (!routeId || !this.isDayClosed()) return;
    if (!confirm('¿Deseas reabrir el día cerrado para esta ruta?')) {
      return;
    }
    this.closingInProgress.set(true);
    this.error.set('');
    try {
      const status = await this.finances.reopenDay(routeId);
      this.dayClosing.set(status);
      this.success.set('Día reabierto exitosamente.');
      await this.reload();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'No fue posible reabrir el día.');
    } finally {
      this.closingInProgress.set(false);
    }
  }

  async deleteEntry(entry: RouteFinancialEntry): Promise<void> {
    if (!confirm(`¿Estás seguro de que deseas eliminar el movimiento "${entry.concept}"?`)) {
      return;
    }
    this.saving.set(true);
    this.error.set('');
    try {
      await this.finances.deleteEntry(entry.id);
      this.success.set('Movimiento eliminado con éxito.');
      await this.reload();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'No fue posible eliminar el movimiento.');
    } finally {
      this.saving.set(false);
    }
  }

  private async loadRoutes(): Promise<void> {
    this.loading.set(true);
    try {
      const routes = await this.routesService.listAccessible();
      this.routes.set(routes);
      const queryRouteId = this.route?.snapshot?.queryParamMap?.get('routeId');
      if (queryRouteId && routes.some((r) => r.id === queryRouteId)) {
        this.selectedRouteId.set(queryRouteId);
      } else {
        this.selectedRouteId.set('');
      }
      await this.reload();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'No fue posible cargar las rutas.');
    } finally {
      this.loading.set(false);
    }
  }

  private async reload(): Promise<void> {
    this.loading.set(true);
    try {
      const routeId = this.selectedRouteId();
      const routes = this.routes();

      if (routeId) {
        // Single Route Selected
        const [bal, incomes, expenses, loansRes, closingStatus] = await Promise.all([
          this.finances.getBalance(routeId),
          this.finances.listEntries(routeId, 'income-investments'),
          this.finances.listEntries(routeId, 'expenses'),
          this.loansService.search(routeId, undefined, undefined, 1, 50).catch(() => ({ items: [] })),
          this.finances.getDayClosingStatus(routeId).catch(() => null),
        ]);

        this.balance.set(bal);
        this.dayClosing.set(closingStatus);

        // Fetch payments for loans in this route
        const loanPayments = await this.fetchPaymentsForLoans(loansRes.items);
        this.buildMovements(incomes, expenses, loansRes.items, loanPayments);
      } else {
        // General: Todas las rutas
        this.dayClosing.set(null);
        if (routes.length === 0) {
          this.balance.set(null);
          this.movements.set([]);
          return;
        }

        const balances = await Promise.all(
          routes.map((r) => this.finances.getBalance(r.id).catch(() => null))
        );

        const validBalances = balances.filter((b): b is RouteBalance => b !== null);
        const generalBalance: RouteBalance = {
          routeId: '',
          routeName: 'Todas las rutas (General)',
          initialBalance: validBalances.reduce((acc, b) => acc + b.initialBalance, 0),
          loanDisbursements: validBalances.reduce((acc, b) => acc + b.loanDisbursements, 0),
          paymentCollections: validBalances.reduce((acc, b) => acc + b.paymentCollections, 0),
          incomeInvestments: validBalances.reduce((acc, b) => acc + b.incomeInvestments, 0),
          expenses: validBalances.reduce((acc, b) => acc + b.expenses, 0),
          netBalance: validBalances.reduce((acc, b) => acc + b.netBalance, 0),
        };
        this.balance.set(generalBalance);

        // Fetch movements from all routes
        const [incomesArrays, expensesArrays, loansRes] = await Promise.all([
          Promise.all(routes.map((r) => this.finances.listEntries(r.id, 'income-investments').catch(() => []))),
          Promise.all(routes.map((r) => this.finances.listEntries(r.id, 'expenses').catch(() => []))),
          this.loansService.search(undefined, undefined, undefined, 1, 50).catch(() => ({ items: [] })),
        ]);

        const allIncomes = incomesArrays.flat();
        const allExpenses = expensesArrays.flat();
        const loanPayments = await this.fetchPaymentsForLoans(loansRes.items);
        this.buildMovements(allIncomes, allExpenses, loansRes.items, loanPayments);
      }
    } catch (err) {
      this.error.set(
        err instanceof Error ? err.message : 'No fue posible consultar los movimientos financieros.'
      );
    } finally {
      this.loading.set(false);
    }
  }

  private async fetchPaymentsForLoans(
    loans: readonly { readonly id: string; readonly customerName: string }[]
  ): Promise<readonly { readonly loanId: string; readonly customerName: string; readonly payment: any }[]> {
    if (loans.length === 0) return [];
    try {
      const results = await Promise.all(
        loans.map(async (l) => {
          try {
            const payments = await this.paymentsService.listByLoan(l.id);
            return payments.map((p) => ({
              loanId: l.id,
              customerName: l.customerName,
              payment: p,
            }));
          } catch {
            return [];
          }
        })
      );
      return results.flat();
    } catch {
      return [];
    }
  }

  private buildMovements(
    manualIncomes: readonly RouteFinancialEntry[],
    manualExpenses: readonly RouteFinancialEntry[],
    loans: readonly any[],
    loanPayments: readonly any[]
  ): void {
    const items: FinancialMovementItem[] = [];

    // 1. Manual Incomes & Investments
    for (const e of manualIncomes) {
      items.push({
        id: `manual-${e.id}`,
        routeId: e.routeId,
        section: 'income',
        badge: e.type === 'Investment' ? 'Inversión' : 'Ingreso',
        badgeClass: e.type === 'Investment' ? 'investment' : 'income',
        concept: e.concept,
        description: e.description,
        amount: e.amount,
        date: new Date(e.createdAtUtc),
        createdBy: e.createdByDisplayName,
        canEdit: e.canEdit && !this.isDayClosed(),
        canDelete: e.canEdit && !this.isDayClosed(),
        rawEntry: e,
      });
    }

    // 2. Cobros realizados (Payments) -> Cash Inflow in 'income'
    for (const lp of loanPayments) {
      const p = lp.payment;
      items.push({
        id: `payment-${p.id}`,
        routeId: p.routeId,
        section: 'income',
        badge: 'Cobro',
        badgeClass: 'payment',
        concept: `Cobro a ${lp.customerName}`,
        description: `${p.paymentMethodName || 'Efectivo'}${p.notes ? ' · ' + p.notes : ''}`,
        amount: p.amount,
        date: new Date(p.registeredAtUtc),
        canEdit: false,
      });
    }

    // 3. Manual Expenses
    for (const e of manualExpenses) {
      items.push({
        id: `manual-${e.id}`,
        routeId: e.routeId,
        section: 'expense',
        badge: 'Gasto',
        badgeClass: 'expense',
        concept: e.concept,
        description: e.description,
        amount: e.amount,
        date: new Date(e.createdAtUtc),
        createdBy: e.createdByDisplayName,
        canEdit: e.canEdit && !this.isDayClosed(),
        canDelete: e.canEdit && !this.isDayClosed(),
        rawEntry: e,
      });
    }

    // 4. Préstamos desembolsados (Loan Disbursements) -> Cash Outflow in 'expense'
    for (const l of loans) {
      items.push({
        id: `loan-${l.id}`,
        routeId: l.routeId,
        section: 'expense',
        badge: 'Préstamo',
        badgeClass: 'loan',
        concept: `Préstamo a ${l.customerName}`,
        description: `Desembolso (${l.installmentCount} cuotas · ${l.paymentFrequency || 'Diario'})`,
        amount: l.principalAmount,
        date: new Date(l.createdAtUtc),
        canEdit: false,
      });
    }

    // Sort descending by date
    items.sort((a, b) => b.date.getTime() - a.date.getTime());
    this.movements.set(items);
  }

  private isSameDay(d1: Date, d2: Date): boolean {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  }

  private getStartOfWeek(d: Date): Date {
    const res = new Date(d);
    const day = res.getDay();
    const diff = (day === 0 ? -6 : 1) - day; // Monday start
    res.setDate(res.getDate() + diff);
    res.setHours(0, 0, 0, 0);
    return res;
  }

  private getEndOfWeek(d: Date): Date {
    const start = this.getStartOfWeek(d);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return end;
  }
}
