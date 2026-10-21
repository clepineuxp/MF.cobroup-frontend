export type UserRole = 'ADMIN' | 'SUPERVISOR' | 'COLLECTOR';

export interface AuthContext {
  readonly userId: string;
  readonly tenantId: string;
  readonly roles: readonly UserRole[];
  readonly routeIds: readonly string[];
}
