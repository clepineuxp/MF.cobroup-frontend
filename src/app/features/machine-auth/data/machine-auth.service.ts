import { Injectable, inject } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { AUTH_CONFIG } from '../../../core/auth/auth.config';

export interface MachineAuthorization { readonly id: string; readonly routeId: string; readonly userId: string; readonly machineId: string; readonly authorizedUntilUtc: string | null; readonly indefinite: boolean; readonly status: string; }
export interface PendingOtp { readonly requestId: string; readonly routeId: string; readonly userId: string; readonly machineId: string; readonly expiresAtUtc: string; }

@Injectable({ providedIn: 'root' })
export class MachineAuthService {
  private readonly auth = inject(AuthService); private readonly config = inject(AUTH_CONFIG);
  async check(routeId: string): Promise<boolean> {
    const response = await this.auth.authorizedFetch(`${this.config.identityBaseUrl}/api/v1/machine-auth/check?routeId=${routeId}`);
    return response.ok;
  }
  async requestOtp(routeId: string): Promise<{ otp: string; expiresAtUtc: string }> {
    const response = await this.auth.authorizedFetch(`${this.config.identityBaseUrl}/api/v1/machine-auth/otp`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ routeId, machineId: this.auth.machineId() }) });
    if (!response.ok) throw new Error('No fue posible generar el código OTP.');
    return (await response.json()) as { otp: string; expiresAtUtc: string };
  }
}
