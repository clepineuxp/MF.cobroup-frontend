export type LoanExceptionStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';

export interface LoanExceptionItem {
  readonly id: string;
  readonly customerId: string;
  readonly customerName: string;
  readonly routeId: string;
  readonly proposedAmount: number;
  readonly proposedDays: number;
  readonly proposedPercentage: number;
  readonly reason: string;
  readonly status: LoanExceptionStatus;
  readonly createdByUserId: string;
  readonly createdByRole: string;
  readonly createdAtUtc: string;
  readonly decidedByUserId?: string | null;
  readonly decidedAtUtc?: string | null;
  readonly decisionNotes?: string | null;
  readonly cancelledByUserId?: string | null;
  readonly cancelledAtUtc?: string | null;
}

export interface LoanExceptionSearchResponse {
  readonly items: readonly LoanExceptionItem[];
  readonly page: number;
  readonly pageSize: number;
  readonly totalCount: number;
}

export interface CreateLoanExceptionRequest {
  readonly customerId: string;
  readonly proposedAmount: number;
  readonly proposedDays: number;
  readonly proposedPercentage: number;
  readonly reason: string;
}
