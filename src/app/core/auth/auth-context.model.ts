export type UserRole = 'Admin' | 'Supervisor' | 'Collector';

export interface AuthContext {
  readonly userId: string;
  readonly organizationId: string;
  readonly organizationCode: string;
  readonly username: string;
  readonly displayName: string;
  readonly role: UserRole;
}
