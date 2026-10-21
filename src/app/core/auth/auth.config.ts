import { InjectionToken } from '@angular/core';

export interface AuthConfig { readonly clientId: string; readonly identityBaseUrl: string; readonly contextEndpoint: string; }
export const AUTH_CONFIG = new InjectionToken<AuthConfig>('COBROUP_AUTH_CONFIG', {
  providedIn: 'root',
  factory: () => ({ clientId: 'cobroup-operational-spa', identityBaseUrl: '/identity', contextEndpoint: '/api/v1/session/me' }),
});
