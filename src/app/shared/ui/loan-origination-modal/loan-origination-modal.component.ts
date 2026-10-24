import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CustomersService } from '../../../features/customers/data/customers.service';
import { CustomerSummary } from '../../../features/customers/data/customer.models';
import { LoanTemplatesService } from '../../../features/loan-templates/data/loan-templates.service';
import { AvailableLoanTemplate } from '../../../features/loan-templates/data/loan-template.models';
import { LoanExceptionsService } from '../../../features/loan-exceptions/data/loan-exceptions.service';
import { LoanExceptionItem } from '../../../features/loan-exceptions/data/loan-exception.models';
import { CalculatedSchedule, LoanDetails, PaymentFrequency } from '../../../features/loans/data/loan.models';
import { LoansService } from '../../../features/loans/data/loans.service';

@Component({
  selector: 'app-loan-origination-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CurrencyPipe],
  templateUrl: './loan-origination-modal.component.html',
  styleUrl: './loan-origination-modal.component.scss',
})
export class LoanOriginationModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() preselectedCustomerId: string | null = null;

  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly loanCreated = new EventEmitter<LoanDetails>();

  private readonly loansService = inject(LoansService);
  private readonly customersService = inject(CustomersService);
  private readonly templatesService = inject(LoanTemplatesService);
  private readonly exceptionsService = inject(LoanExceptionsService);

  readonly customers = signal<readonly CustomerSummary[]>([]);
  readonly templates = signal<readonly AvailableLoanTemplate[]>([]);
  readonly approvedExceptions = signal<readonly LoanExceptionItem[]>([]);
  readonly schedulePreview = signal<CalculatedSchedule | null>(null);

  readonly loading = signal(false);
  readonly submitting = signal(false);
  readonly previewing = signal(false);
  readonly error = signal('');
  readonly success = signal('');

  readonly originationMode = signal<'template' | 'exception'>('template');

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

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if (changes['isOpen'] && this.isOpen) {
      await this.initModal();
    }
  }

  async initModal(): Promise<void> {
    this.form.reset({
      customerId: this.preselectedCustomerId || '',
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
    this.loading.set(true);

    try {
      const [customersRes, templatesRes, exceptionsRes] = await Promise.all([
        this.customersService.search('', '', 1, 100).catch(() => ({ items: [], page: 1, pageSize: 100, totalCount: 0 })),
        this.templatesService.listAvailable(),
        this.exceptionsService.search(undefined, undefined, 'Approved', 1, 100).catch(() => ({ items: [], page: 1, pageSize: 100, totalCount: 0 })),
      ]);

      this.customers.set(customersRes.items.filter((c) => c.status === 'Active'));
      this.templates.set(templatesRes);
      this.approvedExceptions.set(exceptionsRes.items);

      if (this.preselectedCustomerId) {
        this.form.patchValue({ customerId: this.preselectedCustomerId });
      }
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Error al cargar datos para originación.');
    } finally {
      this.loading.set(false);
    }
  }

  close(): void {
    this.closed.emit();
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

  onTemplateChanged(_templateId: string): void {
    this.schedulePreview.set(null);
    this.error.set('');
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

      this.loanCreated.emit(createdLoan);
      this.close();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Error al originar el préstamo.');
    } finally {
      this.submitting.set(false);
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
