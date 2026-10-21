import { CurrencyPipe, DatePipe, NgClass } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CustomersService } from '../../customers/data/customers.service';
import { CustomerSummary } from '../../customers/data/customer.models';
import { LoanTemplatesService } from '../../loan-templates/data/loan-templates.service';
import { AvailableLoanTemplate } from '../../loan-templates/data/loan-template.models';
import { LoanExceptionsService } from '../../loan-exceptions/data/loan-exceptions.service';
import { LoanExceptionItem } from '../../loan-exceptions/data/loan-exception.models';
import { RoutesService } from '../../routes/data/routes.service';
import { AccessibleRoute } from '../../routes/data/route.models';
import {
  CalculatedSchedule,
  LoanDetails,
  LoanSearchItem,
  LoanStatus,
  PaymentFrequency,
} from '../data/loan.models';
import { LoansService } from '../data/loans.service';

@Component({
  selector: 'app-loans-page',
  imports: [ReactiveFormsModule, CurrencyPipe, DatePipe, NgClass],
  templateUrl: './loans.page.html',
  styleUrl: './loans.page.scss',
})
export class LoansPage {
  private readonly loansService = inject(LoansService);
  private readonly customersService = inject(CustomersService);
  private readonly templatesService = inject(LoanTemplatesService);
  private readonly exceptionsService = inject(LoanExceptionsService);
  private readonly routesService = inject(RoutesService);

  readonly items = signal<readonly LoanSearchItem[]>([]);
  readonly customers = signal<readonly CustomerSummary[]>([]);
  readonly templates = signal<readonly AvailableLoanTemplate[]>([]);
  readonly approvedExceptions = signal<readonly LoanExceptionItem[]>([]);
  readonly routes = signal<readonly AccessibleRoute[]>([]);

  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly previewing = signal(false);
  readonly error = signal('');
  readonly success = signal('');

  readonly showOriginationModal = signal(false);
  readonly selectedLoan = signal<LoanDetails | null>(null);
  readonly schedulePreview = signal<CalculatedSchedule | null>(null);

  readonly originationMode = signal<'template' | 'exception'>('template');
  readonly statusFilter = signal<string>('');
  readonly routeFilter = signal<string>('');

  readonly form = new FormGroup({
    customerId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    loanTemplateId: new FormControl(''),
    exceptionRequestId: new FormControl(''),
    principalAmount: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(0.01)],
    }),
    interestRate: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(0.01)],
    }),
    paymentFrequency: new FormControl<PaymentFrequency>('Daily', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    frequencyNDays: new FormControl<number | null>(null),
    installmentCount: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(1)],
    }),
    startDate: new FormControl(this.todayDate(), {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  constructor() {
    void this.init();
  }

  async init(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const [loansRes, customersRes, templatesRes, exceptionsRes, routesRes] = await Promise.all([
        this.loansService.search(),
        this.customersService.search('', '', 1, 100).catch(() => ({ items: [], page: 1, pageSize: 100, totalCount: 0 })),
        this.templatesService.listAvailable().catch(() => []),
        this.exceptionsService.search(undefined, undefined, 'Approved', 1, 100).catch(() => ({ items: [], page: 1, pageSize: 100, totalCount: 0 })),
        this.routesService.listAccessible().catch(() => []),
      ]);

      this.items.set(loansRes.items);
      this.customers.set(customersRes.items.filter((c) => c.status === 'Active'));
      this.templates.set(templatesRes);
      this.approvedExceptions.set(exceptionsRes.items);
      this.routes.set(routesRes);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Error al cargar los préstamos.');
    } finally {
      this.loading.set(false);
    }
  }

  async filterLoans(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const res = await this.loansService.search(
        this.routeFilter() || undefined,
        undefined,
        this.statusFilter() || undefined
      );
      this.items.set(res.items);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Error al filtrar préstamos.');
    } finally {
      this.loading.set(false);
    }
  }

  setStatusFilter(status: string): void {
    this.statusFilter.set(status);
    void this.filterLoans();
  }

  setRouteFilter(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.routeFilter.set(value);
    void this.filterLoans();
  }

  openOrigination(): void {
    this.form.reset({
      customerId: '',
      loanTemplateId: '',
      exceptionRequestId: '',
      principalAmount: null,
      interestRate: null,
      paymentFrequency: 'Daily',
      frequencyNDays: null,
      installmentCount: null,
      startDate: this.todayDate(),
    });
    this.originationMode.set('template');
    this.schedulePreview.set(null);
    this.error.set('');
    this.success.set('');
    this.showOriginationModal.set(true);
  }

  closeOrigination(): void {
    this.showOriginationModal.set(false);
    this.schedulePreview.set(null);
  }

  setOriginationMode(mode: 'template' | 'exception'): void {
    this.originationMode.set(mode);
    this.schedulePreview.set(null);
    if (mode === 'template') {
      this.form.patchValue({ exceptionRequestId: '' });
    } else {
      this.form.patchValue({ loanTemplateId: '' });
    }
  }

  onCustomerChanged(customerId: string): void {
    this.schedulePreview.set(null);
    if (this.originationMode() === 'exception') {
      const customerExceptions = this.approvedExceptions().filter((e) => e.customerId === customerId);
      if (customerExceptions.length > 0) {
        this.selectException(customerExceptions[0].id);
      }
    }
  }

  onTemplateChanged(templateId: string): void {
    const template = this.templates().find((t) => t.id === templateId);
    if (template) {
      this.form.patchValue({
        principalAmount: template.maxPrincipalAmount,
        installmentCount: template.maxLoanDays,
        interestRate: template.allowedPercentages[0] ?? 10,
      });
      void this.calculatePreview();
    }
  }

  selectException(exceptionId: string): void {
    const exception = this.approvedExceptions().find((e) => e.id === exceptionId);
    if (exception) {
      this.form.patchValue({
        exceptionRequestId: exception.id,
        principalAmount: exception.proposedAmount,
        installmentCount: exception.proposedDays,
        interestRate: exception.proposedPercentage,
      });
      void this.calculatePreview();
    }
  }

  get customerExceptions(): readonly LoanExceptionItem[] {
    const customerId = this.form.get('customerId')?.value;
    if (!customerId) return [];
    return this.approvedExceptions().filter((e) => e.customerId === customerId);
  }

  get selectedTemplate(): AvailableLoanTemplate | undefined {
    const templateId = this.form.get('loanTemplateId')?.value;
    return this.templates().find((t) => t.id === templateId);
  }

  async calculatePreview(): Promise<void> {
    const raw = this.form.getRawValue();
    if (!raw.principalAmount || !raw.interestRate || !raw.installmentCount || !raw.startDate) {
      return;
    }

    if (raw.paymentFrequency === 'EveryNDays' && (!raw.frequencyNDays || raw.frequencyNDays <= 0)) {
      return;
    }

    this.previewing.set(true);
    try {
      const schedule = await this.loansService.previewSchedule({
        principalAmount: raw.principalAmount,
        interestRate: raw.interestRate,
        paymentFrequency: raw.paymentFrequency,
        frequencyNDays: raw.frequencyNDays,
        installmentCount: raw.installmentCount,
        startDate: raw.startDate,
      });
      this.schedulePreview.set(schedule);
    } catch {
      this.schedulePreview.set(null);
    } finally {
      this.previewing.set(false);
    }
  }

  async submitOrigination(): Promise<void> {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const mode = this.originationMode();

    if (mode === 'template' && !raw.loanTemplateId) {
      this.error.set('Debe seleccionar una plantilla de crédito publicada.');
      return;
    }

    if (mode === 'exception' && !raw.exceptionRequestId) {
      this.error.set('Debe seleccionar una solicitud de excepción aprobada.');
      return;
    }

    this.submitting.set(true);
    this.error.set('');
    this.success.set('');

    try {
      const template = this.templates().find((t) => t.id === raw.loanTemplateId);
      const createdLoan = await this.loansService.originate({
        customerId: raw.customerId,
        principalAmount: raw.principalAmount!,
        interestRate: raw.interestRate!,
        paymentFrequency: raw.paymentFrequency,
        frequencyNDays: raw.frequencyNDays,
        installmentCount: raw.installmentCount!,
        loanTemplateId: mode === 'template' ? raw.loanTemplateId : null,
        loanTemplateVersion: mode === 'template' ? template?.version ?? null : null,
        exceptionRequestId: mode === 'exception' ? raw.exceptionRequestId : null,
        startDate: raw.startDate,
      });

      this.success.set(`Préstamo originado exitosamente por ${createdLoan.totalAmount.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}.`);
      this.closeOrigination();
      await this.filterLoans();
      await this.viewLoan(createdLoan.id);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Error al originar el préstamo.');
    } finally {
      this.submitting.set(false);
    }
  }

  async viewLoan(loanId: string): Promise<void> {
    this.loading.set(true);
    try {
      const loan = await this.loansService.get(loanId);
      this.selectedLoan.set(loan);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Error al consultar el detalle del préstamo.');
    } finally {
      this.loading.set(false);
    }
  }

  closeDetail(): void {
    this.selectedLoan.set(null);
  }

  private todayDate(): string {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
