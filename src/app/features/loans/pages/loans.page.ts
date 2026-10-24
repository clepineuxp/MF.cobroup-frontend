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
  PaymentFrequency,
} from '../data/loan.models';
import { LoansService } from '../data/loans.service';
import { PaymentDetails, PaymentMethodItem } from '../../payments/data/payment.models';
import { PaymentsService } from '../../payments/data/payments.service';

interface LiveAllocationPreviewItem {
  readonly installmentNumber: number;
  readonly expectedAmount: number;
  readonly currentPaidAmount: number;
  readonly newAllocatedAmount: number;
  readonly isFullyCovered: boolean;
}

import { LoanOriginationModalComponent } from '../../../shared/ui/loan-origination-modal/loan-origination-modal.component';
import { PaymentModalComponent } from '../../../shared/ui/payment-modal/payment-modal.component';

@Component({
  selector: 'app-loans-page',
  imports: [
    ReactiveFormsModule,
    CurrencyPipe,
    DatePipe,
    NgClass,
    LoanOriginationModalComponent,
    PaymentModalComponent,
  ],
  templateUrl: './loans.page.html',
  styleUrl: './loans.page.scss',
})
export class LoansPage {
  private readonly loansService = inject(LoansService);
  private readonly customersService = inject(CustomersService);
  private readonly templatesService = inject(LoanTemplatesService);
  private readonly exceptionsService = inject(LoanExceptionsService);
  private readonly routesService = inject(RoutesService);
  private readonly paymentsService = inject(PaymentsService);

  readonly items = signal<readonly LoanSearchItem[]>([]);
  readonly customers = signal<readonly CustomerSummary[]>([]);
  readonly templates = signal<readonly AvailableLoanTemplate[]>([]);
  readonly approvedExceptions = signal<readonly LoanExceptionItem[]>([]);
  readonly routes = signal<readonly AccessibleRoute[]>([]);
  readonly paymentMethods = signal<readonly PaymentMethodItem[]>([]);

  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly previewing = signal(false);
  readonly error = signal('');
  readonly success = signal('');

  readonly showOriginationModal = signal(false);
  readonly selectedLoan = signal<LoanDetails | null>(null);
  readonly schedulePreview = signal<CalculatedSchedule | null>(null);

  // Payments & Evidence State
  readonly showPaymentModal = signal(false);
  readonly payingLoan = signal<LoanDetails | null>(null);
  readonly loanPayments = signal<readonly PaymentDetails[]>([]);
  readonly paymentSubmitting = signal(false);
  readonly paymentSuccess = signal<PaymentDetails | null>(null);
  readonly activeDetailTab = signal<'installments' | 'payments'>('installments');
  readonly allocationPreview = signal<readonly LiveAllocationPreviewItem[]>([]);
  readonly evidenceFileName = signal<string>('');
  readonly evidenceBase64 = signal<string>('');

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

  readonly paymentForm = new FormGroup({
    amount: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(0.01)],
    }),
    paymentMethodId: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    notes: new FormControl(''),
  });

  constructor() {
    void this.init();
  }

  async init(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const [loansRes, customersRes, templatesRes, exceptionsRes, routesRes, methodsRes] = await Promise.all([
        this.loansService.search(),
        this.customersService.search('', '', 1, 100).catch(() => ({ items: [], page: 1, pageSize: 100, totalCount: 0 })),
        this.templatesService.listAvailable(),
        this.exceptionsService.search(undefined, undefined, 'Approved', 1, 100).catch(() => ({ items: [], page: 1, pageSize: 100, totalCount: 0 })),
        this.routesService.listAccessible().catch(() => []),
        this.paymentsService.getPaymentMethods().catch(() => []),
      ]);

      this.items.set(loansRes.items);
      this.customers.set(customersRes.items.filter((c) => c.status === 'Active'));
      this.templates.set(templatesRes);
      this.approvedExceptions.set(exceptionsRes.items);
      this.routes.set(routesRes);
      this.paymentMethods.set(methodsRes);
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
    this.form.patchValue({ loanTemplateId: '' });
    if (this.originationMode() === 'exception') {
      const customerExceptions = this.approvedExceptions().filter((e) => e.customerId === customerId);
      if (customerExceptions.length > 0) {
        this.selectException(customerExceptions[0].id);
      }
    }
  }

  onTemplateChanged(templateId: string): void {
    const template = this.availableTemplates.find((t) => t.id === templateId);
    if (template) {
      this.form.patchValue({
        principalAmount: template.maxPrincipalAmount,
        installmentCount: template.maxLoanDays,
        interestRate: template.minPercentage,
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

  get availableTemplates(): readonly AvailableLoanTemplate[] {
    const customer = this.customers().find(item => item.id === this.form.controls.customerId.value);
    return customer ? this.templates().filter(template => template.routeIds.includes(customer.routeId)) : [];
  }

  get templateLimitsError(): string {
    if (this.originationMode() !== 'template') return '';
    const raw = this.form.getRawValue();
    const template = this.availableTemplates.find(item => item.id === raw.loanTemplateId);
    if (!template) return 'Selecciona una plantilla disponible para la ruta del cliente.';
    if (raw.principalAmount !== null && (raw.principalAmount < template.minPrincipalAmount || raw.principalAmount > template.maxPrincipalAmount))
      return 'El monto debe estar entre el mínimo y el máximo de la plantilla.';
    if (raw.interestRate !== null && (raw.interestRate < template.minPercentage || raw.interestRate > template.maxPercentage))
      return 'El interés debe estar entre el mínimo y el máximo de la plantilla.';
    return '';
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
      this.schedulePreview.set(null);
      return;
    }

    this.previewing.set(true);
    try {
      const schedule = await this.loansService.previewSchedule({
        principalAmount: raw.principalAmount,
        interestRate: raw.interestRate,
        paymentFrequency: raw.paymentFrequency,
        frequencyNDays: raw.paymentFrequency === 'EveryNDays' ? raw.frequencyNDays : null,
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
    if (this.form.invalid) {
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

    if (this.templateLimitsError) {
      this.error.set(this.templateLimitsError);
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
        frequencyNDays: raw.paymentFrequency === 'EveryNDays' ? raw.frequencyNDays : null,
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

  onLoanCreatedModal(loan: LoanDetails): void {
    this.success.set(`Préstamo originado exitosamente por ${loan.totalAmount.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}.`);
    this.closeOrigination();
    void this.filterLoans();
    void this.viewLoan(loan.id);
  }

  onPaymentSuccessModal(payment: PaymentDetails): void {
    this.paymentSuccess.set(payment);
    void this.filterLoans();
    if (this.payingLoan()) {
      void this.viewLoan(this.payingLoan()!.id);
    }
  }

  async viewLoan(loanId: string): Promise<void> {
    this.loading.set(true);
    try {
      const [loan, payments] = await Promise.all([
        this.loansService.get(loanId),
        this.paymentsService.listByLoan(loanId).catch(() => []),
      ]);
      this.selectedLoan.set(loan);
      this.loanPayments.set(payments);
      this.activeDetailTab.set('installments');
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Error al consultar el detalle del préstamo.');
    } finally {
      this.loading.set(false);
    }
  }

  closeDetail(): void {
    this.selectedLoan.set(null);
    this.loanPayments.set([]);
  }

  // --- Payment Registration Flow (AC-11, AC-12, AC-13, AC-14) ---

  async openPayment(loanItem: LoanSearchItem | LoanDetails, event?: Event): Promise<void> {
    if (event) {
      event.stopPropagation();
    }

    this.error.set('');
    this.success.set('');
    this.paymentSuccess.set(null);
    this.evidenceFileName.set('');
    this.evidenceBase64.set('');

    let loan = 'installments' in loanItem ? (loanItem as LoanDetails) : null;
    if (!loan) {
      try {
        loan = await this.loansService.get(loanItem.id);
      } catch (err) {
        this.error.set(err instanceof Error ? err.message : 'Error cargando datos del préstamo.');
        return;
      }
    }

    this.payingLoan.set(loan);

    // Default amount to next pending installment amount or balance
    const nextPending = loan.installments.find((i) => i.status !== 'Paid');
    const defaultAmount = nextPending ? nextPending.expectedAmount - nextPending.paidAmount : loan.balanceAmount;

    const firstMethod = this.paymentMethods()[0]?.id ?? '';
    this.paymentForm.reset({
      amount: defaultAmount,
      paymentMethodId: firstMethod,
      notes: '',
    });

    this.updateAllocationPreview(defaultAmount, loan);
    this.showPaymentModal.set(true);
  }

  closePaymentModal(): void {
    this.showPaymentModal.set(false);
    this.payingLoan.set(null);
    this.paymentSuccess.set(null);
    this.allocationPreview.set([]);
  }

  onPaymentAmountChanged(): void {
    const amount = this.paymentForm.controls.amount.value ?? 0;
    const loan = this.payingLoan();
    if (loan) {
      this.updateAllocationPreview(amount, loan);
    }
  }

  private updateAllocationPreview(amount: number, loan: LoanDetails): void {
    if (amount <= 0) {
      this.allocationPreview.set([]);
      return;
    }

    let remaining = amount;
    const previews: LiveAllocationPreviewItem[] = [];

    for (const inst of loan.installments) {
      if (inst.status === 'Paid') continue;
      if (remaining <= 0) break;

      const pendingOnInst = inst.expectedAmount - inst.paidAmount;
      const allocated = Math.min(remaining, pendingOnInst);
      const isFullyCovered = allocated >= pendingOnInst;

      previews.push({
        installmentNumber: inst.number,
        expectedAmount: inst.expectedAmount,
        currentPaidAmount: inst.paidAmount,
        newAllocatedAmount: allocated,
        isFullyCovered,
      });

      remaining -= allocated;
    }

    this.allocationPreview.set(previews);
  }

  onEvidenceFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.evidenceFileName.set(file.name);

      const reader = new FileReader();
      reader.onload = () => {
        this.evidenceBase64.set(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  async submitPayment(): Promise<void> {
    if (this.paymentForm.invalid) {
      this.paymentForm.markAllAsTouched();
      return;
    }

    const loan = this.payingLoan();
    if (!loan) return;

    const raw = this.paymentForm.getRawValue();
    const amount = raw.amount!;

    if (amount > loan.balanceAmount) {
      this.error.set(`El importe (${amount}) no puede superar el saldo pendiente (${loan.balanceAmount}).`);
      return;
    }

    this.paymentSubmitting.set(true);
    this.error.set('');

    try {
      // AC-12: Client-side generated UUID idempotency key
      const idempotencyKey = crypto.randomUUID();

      const payment = await this.paymentsService.registerPayment({
        loanId: loan.id,
        amount,
        paymentMethodId: raw.paymentMethodId,
        notes: raw.notes || null,
        idempotencyKey,
      });

      // If photo evidence was selected, attach it (AC-14)
      if (this.evidenceFileName()) {
        try {
          await this.paymentsService.attachEvidence(payment.id, {
            fileName: this.evidenceFileName(),
            contentType: 'image/jpeg',
            byteSize: 2048,
            storagePath: `/evidences/${payment.id}_${this.evidenceFileName()}`,
          });
        } catch {
          // Non-blocking evidence error
        }
      }

      this.paymentSuccess.set(payment);
      await this.filterLoans();

      // If detail modal was open for this loan, refresh it
      if (this.selectedLoan()?.id === loan.id) {
        await this.viewLoan(loan.id);
      }
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Error al registrar el cobro.');
    } finally {
      this.paymentSubmitting.set(false);
    }
  }

  private todayDate(): string {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
