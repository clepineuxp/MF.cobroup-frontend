export type CustomerStatus = 'Active' | 'Inactive';
export type LocationSource = 'Manual' | 'Gps';

export interface CustomerPhone {
  readonly id?: string;
  number: string;
  isPrimary: boolean;
}

export interface CustomerLocation {
  readonly id?: string;
  latitude: number;
  longitude: number;
  alias: string | null;
  address: string | null;
  isPrimary: boolean;
  source: LocationSource;
}

export interface CustomerSummary {
  readonly id: string;
  readonly routeId: string;
  readonly firstNames: string;
  readonly lastNames: string;
  readonly businessOrWorkName: string | null;
  readonly primaryPhone: string;
  readonly primaryLatitude: number;
  readonly primaryLongitude: number;
  readonly status: CustomerStatus;
  readonly updatedAtUtc: string;
}

export interface CustomerDetails {
  readonly id: string;
  readonly routeId: string;
  readonly firstNames: string;
  readonly lastNames: string;
  readonly businessOrWorkName: string | null;
  readonly observations: string | null;
  readonly status: CustomerStatus;
  readonly phones: readonly CustomerPhone[];
  readonly locations: readonly CustomerLocation[];
  readonly createdAtUtc: string;
  readonly updatedAtUtc: string;
}

export interface CustomerPage {
  readonly items: readonly CustomerSummary[];
  readonly page: number;
  readonly pageSize: number;
  readonly totalCount: number;
}

export interface CustomerWriteRequest {
  readonly routeId: string;
  readonly firstNames: string;
  readonly lastNames: string;
  readonly businessOrWorkName: string | null;
  readonly observations: string | null;
  readonly status: CustomerStatus;
  readonly phones: readonly CustomerPhone[];
  readonly locations: readonly CustomerLocation[];
}
