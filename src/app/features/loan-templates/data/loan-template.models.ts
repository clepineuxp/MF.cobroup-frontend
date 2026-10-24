export interface AvailableLoanTemplate {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly classification: 'Low' | 'High' | 'CustomTemplate';
  readonly status: 'Published';
  readonly version: number;
  readonly maxLoanDays: number;
  readonly maxPrincipalAmount: number;
  readonly allowedPercentages?: readonly number[];
  readonly minPrincipalAmount: number;
  readonly minPercentage: number;
  readonly maxPercentage: number;
  readonly routeIds: readonly string[];
  readonly updatedAtUtc: string;
}
