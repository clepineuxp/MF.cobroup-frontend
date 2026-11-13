import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { LoanDetails } from '../../../features/loans/data/loan.models';
import { PaymentDetails, PaymentMethodItem } from '../../../features/payments/data/payment.models';
import { PaymentsService } from '../../../features/payments/data/payments.service';
import {
  generateLoanStatusVoucherImage,
  GeneratedLoanVoucher,
  LoanPaymentHistoryItem,
  LoanStatusVoucherData,
  LoanVoucherInstallment,
  shareLoanStatusVoucher,
} from '../../utils/loan-voucher';

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
  @Input() customerPhone?: string;
  @Input() customerIdentification?: string;

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

  // Voucher step signals
  readonly voucherStep = signal(false);
  readonly voucherImage = signal('');
  readonly generatedVoucher = signal<GeneratedLoanVoucher | null>(null);
  readonly voucherData = signal<LoanStatusVoucherData | null>(null);
  readonly existingPayments = signal<readonly PaymentDetails[]>([]);

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
    this.voucherStep.set(false);
    this.voucherImage.set('');
    this.generatedVoucher.set(null);
    this.voucherData.set(null);
    this.existingPayments.set([]);
    this.loading.set(true);

    try {
      const methods = await this.paymentsService.getPaymentMethods().catch(() => []);
      this.paymentMethods.set(methods);

      if (this.loan) {
        // Fetch existing payment history for voucher projection
        const prev = await this.paymentsService.listByLoan(this.loan.id).catch(() => []);
        this.existingPayments.set(prev);

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

  /**
   * Generates the payment voucher preview with pending installments and payment history.
   * Prompts user with 3 options: Confirmar, Confirmar y enviar, Corregir.
   */
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
      const paymentMethodName = this.paymentMethods().find((m) => m.id === raw.paymentMethodId)?.name || 'Efectivo';
      const newPaymentItem: LoanPaymentHistoryItem = {
        date: new Date().toLocaleDateString('es-CO'),
        amount,
        paymentMethodName,
        notes: raw.notes || null,
        remainingBalance: Math.max(0, this.loan.balanceAmount - amount),
        isNew: true,
      };

      const historyItems: LoanPaymentHistoryItem[] = this.existingPayments().map((p) => ({
        date: new Date(p.registeredAtUtc).toLocaleDateString('es-CO'),
        amount: p.amount,
        paymentMethodName: p.paymentMethodName,
        notes: p.notes,
      }));

      const pendingInstallments: LoanVoucherInstallment[] = [];
      for (const inst of this.loan.installments) {
        if (inst.status === 'Paid') continue;
        const alloc = this.allocationPreview().find((a) => a.installmentNumber === inst.number);
        if (alloc && alloc.isFullyCovered) {
          continue; // completely covered by this payment
        }
        const currentPending = inst.expectedAmount - inst.paidAmount;
        const allocatedHere = alloc ? alloc.newAllocatedAmount : 0;
        const remainingDue = currentPending - allocatedHere;
        if (remainingDue > 0) {
          pendingInstallments.push({
            number: inst.number,
            dueDate: inst.dueDate,
            expectedAmount: remainingDue,
          });
        }
      }

      const voucherData: LoanStatusVoucherData = {
        customerName: this.loan.customerName,
        customerIdentification: this.customerIdentification,
        customerPhone: this.customerPhone,
        routeName: this.loan.routeName,
        principalAmount: this.loan.principalAmount,
        totalAmount: this.loan.totalAmount,
        balanceAmount: Math.max(0, this.loan.balanceAmount - amount),
        totalPaidAmount: (this.loan.totalAmount - this.loan.balanceAmount) + amount,
        startDate: this.loan.startsAtUtc ? this.loan.startsAtUtc.split('T')[0] : (this.loan.installments[0]?.dueDate || ''),
        dueDate: this.loan.dueAtUtc ? this.loan.dueAtUtc.split('T')[0] : (this.loan.installments[this.loan.installments.length - 1]?.dueDate || ''),
        paymentFrequency: this.loan.paymentFrequency,
        frequencyNDays: this.loan.frequencyNDays,
        paymentHistory: [newPaymentItem, ...historyItems],
        pendingInstallments,
      };

      const voucher = await generateLoanStatusVoucherImage(voucherData);
      this.voucherData.set(voucherData);
      this.generatedVoucher.set(voucher);
      this.voucherImage.set(voucher.dataUrl);
      this.voucherStep.set(true);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Error al generar el comprobante.');
    } finally {
      this.submitting.set(false);
    }
  }

  correctPayment(): void {
    this.voucherStep.set(false);
  }

  async confirmPaymentOnly(): Promise<void> {
    await this.executePaymentRegistration(false);
  }

  async confirmAndSendPayment(): Promise<void> {
    await this.executePaymentRegistration(true);
  }

  private async executePaymentRegistration(sendVoucher: boolean): Promise<void> {
    if (!this.loan) return;

    const raw = this.form.getRawValue();
    const amount = raw.amount!;

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

      // If send was requested, dispatch through Web Share / WhatsApp
      if (sendVoucher && this.generatedVoucher() && this.voucherData()) {
        try {
          await shareLoanStatusVoucher(this.generatedVoucher()!, this.voucherData()!, true);
        } catch {
          // Non-blocking share error
        }
      }

      this.voucherStep.set(false);
      this.successPayment.set(payment);
      this.paymentSuccess.emit(payment);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Error al registrar el cobro.');
    } finally {
      this.submitting.set(false);
    }
  }
}
