export type PaymentFrequency = 'Daily' | 'Weekly' | 'EveryNDays' | 'Monthly';
export type LoanStatus = 'Active' | 'PaidOff' | 'Cancelled';
export type InstallmentStatus = 'Pending' | 'PartiallyPaid' | 'Paid';

export interface InstallmentDetails {
  readonly id: string;
  readonly number: number;
  readonly dueDate: string;
  readonly expectedAmount: number;
  readonly paidAmount: number;
  readonly status: InstallmentStatus;
}

export interface LoanDetails {
  readonly id: string;
  readonly customerId: string;
  readonly customerName: string;
  readonly routeId: string;
  readonly routeName: string;
  readonly loanTemplateId?: string | null;
  readonly loanTemplateVersion?: number | null;
  readonly exceptionRequestId?: string | null;
  readonly status: LoanStatus;
  readonly principalAmount: number;
  readonly interestRate: number;
  readonly interestAmount: number;
  readonly totalAmount: number;
  readonly paidAmount: number;
  readonly balanceAmount: number;
  readonly paymentFrequency: PaymentFrequency;
  readonly frequencyNDays?: number | null;
  readonly installmentCount: number;
  readonly startsAtUtc: string;
  readonly dueAtUtc: string;
  readonly createdByUserId: string;
  readonly createdByRole: string;
  readonly createdAtUtc: string;
  readonly installments: readonly InstallmentDetails[];
}

export interface LoanSearchItem {
  readonly id: string;
  readonly customerId: string;
  readonly customerName: string;
  readonly routeId: string;
  readonly principalAmount: number;
  readonly interestRate: number;
  readonly totalAmount: number;
  readonly balanceAmount: number;
  readonly paymentFrequency: PaymentFrequency;
  readonly installmentCount: number;
  readonly status: LoanStatus;
  readonly startsAtUtc: string;
  readonly dueAtUtc: string;
  readonly createdAtUtc: string;
}

export interface LoanSearchResponse {
  readonly items: readonly LoanSearchItem[];
  readonly page: number;
  readonly pageSize: number;
  readonly totalCount: number;
}

export interface OriginateLoanRequest {
  readonly customerId: string;
  readonly principalAmount: number;
  readonly interestRate: number;
  readonly paymentFrequency: PaymentFrequency;
  readonly frequencyNDays?: number | null;
  readonly installmentCount: number;
  readonly loanTemplateId?: string | null;
  readonly loanTemplateVersion?: number | null;
  readonly exceptionRequestId?: string | null;
  readonly startDate: string;
}

export interface CalculatedInstallment {
  readonly number: number;
  readonly dueDate: string;
  readonly expectedAmount: number;
}

export interface CalculatedSchedule {
  readonly principalAmount: number;
  readonly interestRate: number;
  readonly interestAmount: number;
  readonly totalAmount: number;
  readonly paymentFrequency: PaymentFrequency;
  readonly frequencyNDays?: number | null;
  readonly installmentCount: number;
  readonly startDate: string;
  readonly dueDate: string;
  readonly installments: readonly CalculatedInstallment[];
}

export interface PreviewLoanScheduleRequest {
  readonly principalAmount: number;
  readonly interestRate: number;
  readonly paymentFrequency: PaymentFrequency;
  readonly frequencyNDays?: number | null;
  readonly installmentCount: number;
  readonly startDate: string;
}
