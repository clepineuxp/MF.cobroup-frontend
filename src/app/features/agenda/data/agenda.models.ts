export type AgendaStatus = 'Overdue' | 'DueToday' | 'Collected' | 'UpToDate' | 'WillNotPayToday';

export interface AgendaItem {
  customerId: string;
  customerName: string;
  businessOrWorkName: string | null;
  primaryPhone: string | null;
  routeId: string;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  alias: string | null;
  activeLoanId: string | null;
  loanBalance: number;
  overdueAmount: number;
  daysOverdue: number;
  dueTodayAmount: number;
  collectedTodayAmount: number;
  status: AgendaStatus;
  statusLabel: string;
  markerColor: string;
  distanceKm: number | null;
}

export interface AgendaSummary {
  targetDate: string;
  routeId: string | null;
  totalCustomers: number;
  totalDueToday: number;
  totalOverdue: number;
  totalCollectedToday: number;
  overdueCount: number;
  dueTodayCount: number;
  collectedCount: number;
  upToDateCount: number;
}

export interface AgendaResponse {
  summary: AgendaSummary;
  items: AgendaItem[];
}

export interface CustomerMapLocation {
  customerId: string;
  customerName: string;
  businessOrWorkName: string | null;
  primaryPhone: string | null;
  routeId: string;
  latitude: number;
  longitude: number;
  address: string | null;
  alias: string | null;
  activeLoanId: string | null;
  loanBalance: number;
  overdueAmount: number;
  dueTodayAmount: number;
  status: AgendaStatus;
  markerColor: string;
  avatarUrl?: string | null;
}

export interface AgingBucket {
  bucketKey: string;
  label: string;
  minDays: number;
  maxDays: number | null;
  totalAmount: number;
  loanCount: number;
}

export interface RoutePortfolioItem {
  routeId: string;
  activeLoansCount: number;
  activeCustomersCount: number;
  totalPlacedAmount: number;
  totalCollectedAmount: number;
  totalBalanceAmount: number;
  overdueBalanceAmount: number;
  portfolioAtRiskRate: number;
  agingBuckets: AgingBucket[];
}

export interface PortfolioAnalytics {
  targetDate: string;
  totalActiveLoans: number;
  totalActiveCustomers: number;
  totalPlacedAmount: number;
  totalCollectedAmount: number;
  totalBalanceAmount: number;
  totalOverdueAmount: number;
  portfolioAtRiskRate: number;
  dailyCollectionEfficiencyRate: number;
  agingBuckets: AgingBucket[];
  routesPerformance: RoutePortfolioItem[];
}
