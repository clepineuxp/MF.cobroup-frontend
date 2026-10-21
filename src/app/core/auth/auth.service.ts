import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AUTH_CONFIG } from './auth.config';
import { AuthContext } from './auth-context.model';

export interface LoginCredentials { readonly organizationCode: string; readonly username: string; readonly password: string; }
interface TokenResponse { readonly access_token: string; readonly refresh_token?: string; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly config = inject(AUTH_CONFIG);
  private readonly router = inject(Router);
  private readonly contextState = signal<AuthContext | null>(null);
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  readonly context = this.contextState.asReadonly();
  readonly isAuthenticated = computed(() => this.contextState() !== null && this.accessToken !== null);

  async login(credentials: LoginCredentials): Promise<void> {
    const token = await this.getAntiforgeryToken();
    const response = await fetch(`${this.config.identityBaseUrl}/api/v1/auth/session`, {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': token }, body: JSON.stringify(credentials),
    });
    if (!response.ok) throw new Error(response.status === 401 ? 'Credenciales inválidas.' : 'No fue posible iniciar sesión.');
    await this.beginAuthorization();
  }

  async beginAuthorization(): Promise<void> {
    const verifier = this.base64Url(crypto.getRandomValues(new Uint8Array(64)));
    const state = this.base64Url(crypto.getRandomValues(new Uint8Array(32)));
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
    sessionStorage.setItem('cobroup.oidc.verifier', verifier); sessionStorage.setItem('cobroup.oidc.state', state);
    const query = new URLSearchParams({ client_id: this.config.clientId, redirect_uri: `${window.location.origin}/auth/callback`,
      response_type: 'code', scope: 'openid profile offline_access cobroup-api', code_challenge: this.base64Url(new Uint8Array(digest)), code_challenge_method: 'S256', state });
    window.location.assign(`${this.config.identityBaseUrl}/connect/authorize?${query.toString()}`);
  }

  async completeAuthorization(callbackUrl: string): Promise<void> {
    const query = new URL(callbackUrl).searchParams;
    const code = query.get('code'); const returnedState = query.get('state');
    const expectedState = sessionStorage.getItem('cobroup.oidc.state'); const verifier = sessionStorage.getItem('cobroup.oidc.verifier');
    sessionStorage.removeItem('cobroup.oidc.state'); sessionStorage.removeItem('cobroup.oidc.verifier');
    if (!code || !verifier || !expectedState || returnedState !== expectedState) throw new Error('La respuesta de identidad no es válida.');
    const body = new URLSearchParams({ grant_type: 'authorization_code', client_id: this.config.clientId,
      redirect_uri: `${window.location.origin}/auth/callback`, code, code_verifier: verifier });
    const response = await fetch(`${this.config.identityBaseUrl}/connect/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
    if (!response.ok) throw new Error('No fue posible completar la autenticación.');
    const tokens = (await response.json()) as TokenResponse;
    this.accessToken = tokens.access_token; this.refreshToken = tokens.refresh_token ?? null;
    await this.loadContext(); await this.router.navigateByUrl('/');
  }

  async logout(): Promise<void> {
    if (this.refreshToken) await fetch(`${this.config.identityBaseUrl}/connect/revocation`, { method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token: this.refreshToken, token_type_hint: 'refresh_token', client_id: this.config.clientId }) });
    const token = await this.getAntiforgeryToken();
    await fetch(`${this.config.identityBaseUrl}/api/v1/auth/session`, { method: 'DELETE', credentials: 'include', headers: { 'X-XSRF-TOKEN': token } });
    this.accessToken = null; this.refreshToken = null; this.contextState.set(null); await this.router.navigateByUrl('/login');
  }

  async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) return false;
    const response = await fetch(`${this.config.identityBaseUrl}/connect/token`, { method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: this.refreshToken, client_id: this.config.clientId }) });
    if (!response.ok) return false;
    const tokens = (await response.json()) as TokenResponse;
    this.accessToken = tokens.access_token; this.refreshToken = tokens.refresh_token ?? this.refreshToken;
    await this.loadContext(); return true;
  }

  private async loadContext(): Promise<void> {
    const response = await fetch(this.config.contextEndpoint, { headers: { Authorization: `Bearer ${this.accessToken}` } });
    if (!response.ok) throw new Error('El token no contiene un contexto de organización válido.');
    this.contextState.set((await response.json()) as AuthContext);
  }

  private async getAntiforgeryToken(): Promise<string> {
    const response = await fetch(`${this.config.identityBaseUrl}/api/v1/auth/antiforgery`, { credentials: 'include' });
    if (!response.ok) throw new Error('No fue posible preparar la solicitud segura.');
    return ((await response.json()) as { requestToken: string }).requestToken;
  }

  private base64Url(bytes: Uint8Array): string { return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', ''); }
}
