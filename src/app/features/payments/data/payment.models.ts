export interface PaymentMethodItem {
  readonly id: string;
  readonly name: string;
  readonly displayOrder: number;
}

export interface PaymentAllocationItem {
  readonly installmentId: string;
  readonly installmentNumber: number;
  readonly amountAllocated: number;
  readonly isFullyCovered: boolean;
}

export interface PaymentEvidenceItem {
  readonly id: string;
  readonly fileName: string;
  readonly contentType: string;
  readonly byteSize: number;
  readonly uploadedAtUtc: string;
  readonly isDeleted: boolean;
}

export interface PaymentDetails {
  readonly id: string;
  readonly loanId: string;
  readonly customerId: string;
  readonly routeId: string;
  readonly amount: number;
  readonly paymentMethodId: string;
  readonly paymentMethodName: string;
  readonly notes?: string | null;
  readonly idempotencyKey: string;
  readonly registeredAtUtc: string;
  readonly remainingLoanBalance: number;
  readonly loanStatus: 'Active' | 'PaidOff' | 'Cancelled';
  readonly allocations: readonly PaymentAllocationItem[];
  readonly evidences: readonly PaymentEvidenceItem[];
}

export interface RegisterPaymentRequest {
  readonly loanId: string;
  readonly amount: number;
  readonly paymentMethodId: string;
  readonly notes?: string | null;
  readonly idempotencyKey: string;
}

export interface PaymentMethodReconciliationSummary {
  readonly paymentMethodId: string;
  readonly paymentMethodName: string;
  readonly totalAmount: number;
  readonly count: number;
}

export interface DailyReconciliationReport {
  readonly routeId: string;
  readonly date: string;
  readonly totalCollected: number;
  readonly paymentCount: number;
  readonly methodBreakdown: readonly PaymentMethodReconciliationSummary[];
}

export interface AttachPaymentEvidenceRequest {
  readonly fileName: string;
  readonly contentType: string;
  readonly byteSize: number;
  readonly storagePath: string;
}
