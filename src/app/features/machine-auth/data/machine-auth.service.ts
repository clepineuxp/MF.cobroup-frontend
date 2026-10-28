import { Injectable, inject, signal } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { AUTH_CONFIG } from '../../../core/auth/auth.config';
import { RoutesService } from '../../routes/data/routes.service';

export interface MachineAuthorization { readonly id: string; readonly routeId: string; readonly userId: string; readonly machineId: string; readonly authorizedUntilUtc: string | null; readonly indefinite: boolean; readonly status: string; }
export interface PendingOtp { readonly requestId: string; readonly routeId: string; readonly userId: string; readonly machineId: string; readonly expiresAtUtc: string; }

@Injectable({ providedIn: 'root' })
export class MachineAuthService {
  private readonly auth = inject(AuthService); private readonly config = inject(AUTH_CONFIG); private readonly routesService = inject(RoutesService);
  readonly hasAuthorizedRoute = signal(false);
  private accessCheckPromise: Promise<boolean> | null = null;

  async check(routeId: string): Promise<boolean> {
    const response = await this.auth.authorizedFetch(`${this.config.identityBaseUrl}/api/v1/machine-auth/check?routeId=${routeId}`);
    const authorized = response.ok;
    if (authorized) this.hasAuthorizedRoute.set(true);
    return authorized;
  }

  async refreshAuthorizedRouteAccess(): Promise<boolean> {
    if (this.accessCheckPromise) return this.accessCheckPromise;
    this.hasAuthorizedRoute.set(false);
    this.accessCheckPromise = this.loadAuthorizedRouteAccess().finally(() => {
      this.accessCheckPromise = null;
    });
    return this.accessCheckPromise;
  }

  resetAuthorizedRouteAccess(): void {
    this.hasAuthorizedRoute.set(false);
  }

  private async loadAuthorizedRouteAccess(): Promise<boolean> {
    try {
      const routes = await this.routesService.listAccessible();
      if (routes.length === 0) return false;
      const checks = await Promise.allSettled(routes.map((route) => this.check(route.id)));
      const authorized = checks.some((result) => result.status === 'fulfilled' && result.value);
      this.hasAuthorizedRoute.set(authorized);
      return authorized;
    } catch {
      return false;
    }
  }
  async requestOtp(routeId: string, regenerate = false): Promise<{ otp: string | null; createdAtUtc: string; expiresAtUtc: string; reused: boolean }> {
    const response = await this.auth.authorizedFetch(`${this.config.identityBaseUrl}/api/v1/machine-auth/otp`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ routeId, machineId: this.auth.machineId(), regenerate }) });
    if (!response.ok) throw new Error('No fue posible generar el código OTP.');
    return (await response.json()) as { otp: string | null; createdAtUtc: string; expiresAtUtc: string; reused: boolean };
  }
}
