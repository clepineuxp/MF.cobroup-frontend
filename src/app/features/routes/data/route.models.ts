export interface AccessibleRoute {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly accessAs: 'Admin' | 'Supervisor' | 'Collector';
  readonly maxActiveCustomers: number | null;
  readonly maxActiveLoans: number | null;
  readonly initialBalance: number;
  readonly timeZoneId: string;
}
