import { CurrencyPipe, DatePipe, NgClass } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CustomersService } from '../../customers/data/customers.service';
import { CustomerSummary } from '../../customers/data/customer.models';
import { LoanExceptionItem, LoanExceptionStatus } from '../data/loan-exception.models';
import { LoanExceptionsService } from '../data/loan-exceptions.service';

@Component({
  selector: 'app-loan-exceptions-page',
  imports: [ReactiveFormsModule, CurrencyPipe, DatePipe, NgClass],
  templateUrl: './loan-exceptions.page.html',
  styleUrl: './loan-exceptions.page.scss',
})
export class LoanExceptionsPage {
  private readonly exceptionsService = inject(LoanExceptionsService);
  private readonly customersService = inject(CustomersService);

  readonly items = signal<readonly LoanExceptionItem[]>([]);
  readonly customers = signal<readonly CustomerSummary[]>([]);
  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly error = signal('');
  readonly success = signal('');

  readonly form = new FormGroup({
    customerId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    proposedAmount: new FormControl<number | null>(null, { validators: [Validators.required, Validators.min(0.01)] }),
    proposedDays: new FormControl<number | null>(null, { validators: [Validators.required, Validators.min(1)] }),
    proposedPercentage: new FormControl<number | null>(null, { validators: [Validators.required, Validators.min(0.01)] }),
    reason: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(500)] }),
  });

  constructor() {
    void this.init();
  }

  async init(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const [exceptionsRes, customersRes] = await Promise.all([
        this.exceptionsService.search(),
        this.customersService.search('', '', 1, 100).catch(() => ({ items: [], page: 1, pageSize: 100, totalCount: 0 })),
      ]);
      this.items.set(exceptionsRes.items);
      this.customers.set(customersRes.items.filter((c) => c.status === 'Active'));
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Error al inicializar excepciones.');
    } finally {
      this.loading.set(false);
    }
  }

  async submit(): Promise<void> {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.error.set('');
    this.success.set('');

    const values = this.form.getRawValue();
    try {
      await this.exceptionsService.create({
        customerId: values.customerId,
        proposedAmount: values.proposedAmount!,
        proposedDays: values.proposedDays!,
        proposedPercentage: values.proposedPercentage!,
        reason: values.reason.trim(),
      });

      this.success.set('Solicitud de excepción registrada correctamente. Pendiente de aprobación administrativa.');
      this.form.reset();
      const res = await this.exceptionsService.search();
      this.items.set(res.items);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Error al registrar la solicitud.');
    } finally {
      this.submitting.set(false);
    }
  }

  async cancelRequest(item: LoanExceptionItem): Promise<void> {
    if (item.status !== 'Pending') return;
    this.error.set('');
    this.success.set('');
    try {
      await this.exceptionsService.cancel(item.id);
      this.success.set('Solicitud de excepción cancelada correctamente.');
      const res = await this.exceptionsService.search();
      this.items.set(res.items);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Error al cancelar la solicitud.');
    }
  }

  getStatusClass(status: LoanExceptionStatus): string {
    switch (status) {
      case 'Approved': return 'status-approved';
      case 'Rejected': return 'status-rejected';
      case 'Cancelled': return 'status-cancelled';
      default: return 'status-pending';
    }
  }

  getStatusLabel(status: LoanExceptionStatus): string {
    switch (status) {
      case 'Approved': return 'Aprobada';
      case 'Rejected': return 'Rechazada';
      case 'Cancelled': return 'Cancelada';
      default: return 'Pendiente';
    }
  }
}
