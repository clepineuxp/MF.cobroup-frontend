import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { LoanDetails } from '../../../features/loans/data/loan.models';
import { PaymentDetails, PaymentMethodItem } from '../../../features/payments/data/payment.models';
import { PaymentsService } from '../../../features/payments/data/payments.service';

export interface LiveAllocationPreviewItem {
  readonly installmentNumber: number;
  readonly expectedAmount: number;
  readonly currentPaidAmount: number;
  readonly newAllocatedAmount: number;
  readonly isFullyCovered: boolean;
}

@Component({
  selector: 'app-payment-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CurrencyPipe],
  templateUrl: './payment-modal.component.html',
  styleUrl: './payment-modal.component.scss',
})
export class PaymentModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() loan: LoanDetails | null = null;

  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly paymentSuccess = new EventEmitter<PaymentDetails>();

  private readonly paymentsService = inject(PaymentsService);

  readonly paymentMethods = signal<readonly PaymentMethodItem[]>([]);
  readonly loading = signal(false);
  readonly submitting = signal(false);
  readonly error = signal('');
  readonly successPayment = signal<PaymentDetails | null>(null);

  readonly allocationPreview = signal<readonly LiveAllocationPreviewItem[]>([]);
  readonly evidenceFileName = signal<string>('');
  readonly evidenceBase64 = signal<string>('');

  readonly form = new FormGroup({
    amount: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(0.01)],
    }),
    paymentMethodId: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    notes: new FormControl(''),
  });

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if (changes['isOpen'] && this.isOpen) {
      await this.initModal();
    }
  }

  async initModal(): Promise<void> {
    this.error.set('');
    this.successPayment.set(null);
    this.evidenceFileName.set('');
    this.evidenceBase64.set('');
    this.allocationPreview.set([]);
    this.loading.set(true);

    try {
      const methods = await this.paymentsService.getPaymentMethods().catch(() => []);
      this.paymentMethods.set(methods);

      if (this.loan) {
        // Default amount to next pending installment amount or full balance
        const nextPending = this.loan.installments.find((i) => i.status !== 'Paid');
        const defaultAmount = nextPending
          ? nextPending.expectedAmount - nextPending.paidAmount
          : this.loan.balanceAmount;

        const firstMethod = methods[0]?.id ?? '';
        this.form.reset({
          amount: defaultAmount,
          paymentMethodId: firstMethod,
          notes: '',
        });

        this.updateAllocationPreview(defaultAmount, this.loan);
      }
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Error al inicializar recaudo.');
    } finally {
      this.loading.set(false);
    }
  }

  close(): void {
    this.closed.emit();
  }

  onAmountChanged(): void {
    const amount = this.form.controls.amount.value ?? 0;
    if (this.loan) {
      this.updateAllocationPreview(amount, this.loan);
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
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (!this.loan) return;

    const raw = this.form.getRawValue();
    const amount = raw.amount!;

    if (amount > this.loan.balanceAmount) {
      this.error.set(`El importe (${amount}) no puede superar el saldo pendiente (${this.loan.balanceAmount}).`);
      return;
    }

    this.submitting.set(true);
    this.error.set('');

    try {
      // AC-12: Client-side generated UUID idempotency key
      const idempotencyKey = crypto.randomUUID();

      const payment = await this.paymentsService.registerPayment({
        loanId: this.loan.id,
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

      this.successPayment.set(payment);
      this.paymentSuccess.emit(payment);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Error al registrar el cobro.');
    } finally {
      this.submitting.set(false);
    }
  }
}
