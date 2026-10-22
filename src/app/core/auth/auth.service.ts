import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AUTH_CONFIG } from './auth.config';
import { AuthContext } from './auth-context.model';

export interface LoginCredentials { readonly username: string; readonly password: string; }
export type LoginOutcome = 'authenticated' | 'membership_required';
export interface OrganizationOption {
  readonly organizationId: string;
  readonly organizationCode: string;
  readonly organizationName: string;
  readonly role: string;
  readonly lastAccessedAtUtc: string | null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly config = inject(AUTH_CONFIG);
  private readonly router = inject(Router);
  private readonly contextState = signal<AuthContext | null>(null);
  private accessToken: string | null = null;
  private refreshPromise: Promise<boolean> | null = null;
  private antiforgeryToken: string | null = null;
  private antiforgeryPromise: Promise<string | null> | null = null;

  readonly context = this.contextState.asReadonly();
  readonly isAuthenticated = computed(() => this.contextState() !== null && this.accessToken !== null);

  constructor() {
    this.initSession().catch(() => {});
  }

  private async initSession(): Promise<void> {
    await this.ensureAntiforgeryToken();
    await this.refreshAccessToken();
  }

  async ensureAntiforgeryToken(force = false): Promise<string | null> {
    if (!force && this.antiforgeryToken) {
      return this.antiforgeryToken;
    }
    if (this.antiforgeryPromise) {
      return this.antiforgeryPromise;
    }
    this.antiforgeryPromise = this.fetchAntiforgeryToken().finally(() => {
      this.antiforgeryPromise = null;
    });
    return this.antiforgeryPromise;
  }

  private async fetchAntiforgeryToken(): Promise<string | null> {
    try {
      const response = await fetch(`${this.config.identityBaseUrl}/api/v1/auth/antiforgery`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Cache-Control': 'no-store' }
      });
      if (!response.ok) return null;
      const data = (await response.json()) as { requestToken?: string };
      this.antiforgeryToken = data.requestToken ?? null;
      return this.antiforgeryToken;
    } catch {
      return null;
    }
  }

  async login(credentials: LoginCredentials): Promise<LoginOutcome> {
    const response = await fetch(`${this.config.identityBaseUrl}/api/v1/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.message ?? (response.status === 401 ? 'Credenciales inválidas.' : 'No fue posible iniciar sesión.'));
    }

    const result = (await response.json()) as {
      status: string;
      access_token?: string;
    };

    if (result.status === 'membership_required') {
      return 'membership_required';
    }

    this.accessToken = result.access_token ?? null;
    await this.ensureAntiforgeryToken(true);
    await this.loadContext();
    await this.router.navigateByUrl('/');
    return 'authenticated';
  }

  async listOrganizations(): Promise<readonly OrganizationOption[]> {
    const headers: Record<string, string> = {};
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }
    const response = await fetch(`${this.config.identityBaseUrl}/api/v1/auth/organizations`, {
      credentials: 'include',
      headers
    });
    if (!response.ok) throw new Error('No fue posible consultar tus organizaciones.');
    return (await response.json()) as OrganizationOption[];
  }

  async selectOrganization(organizationId: string): Promise<void> {
    const xsrf = await this.ensureAntiforgeryToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }
    if (xsrf) {
      headers['X-XSRF-TOKEN'] = xsrf;
    }

    let response = await fetch(`${this.config.identityBaseUrl}/api/v1/auth/organizations/current`, {
      method: 'PUT',
      credentials: 'include',
      headers,
      body: JSON.stringify({ organizationId }),
    });

    if (await this.isCsrfFailure(response)) {
      const freshXsrf = await this.ensureAntiforgeryToken(true);
      if (freshXsrf) {
        headers['X-XSRF-TOKEN'] = freshXsrf;
        response = await fetch(`${this.config.identityBaseUrl}/api/v1/auth/organizations/current`, {
          method: 'PUT',
          credentials: 'include',
          headers,
          body: JSON.stringify({ organizationId }),
        });
      }
    }

    if (!response.ok) throw new Error('No fue posible cambiar de organización.');

    const result = (await response.json()) as { access_token?: string };
    if (result.access_token) {
      this.accessToken = result.access_token;
    }

    await this.loadContext();
    await this.router.navigateByUrl('/');
  }

  async logout(): Promise<{ remoteRevoked: boolean }> {
    let remoteRevoked = false;
    try {
      const xsrf = await this.ensureAntiforgeryToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (this.accessToken) {
        headers['Authorization'] = `Bearer ${this.accessToken}`;
      }
      if (xsrf) {
        headers['X-XSRF-TOKEN'] = xsrf;
      }
      let response = await fetch(`${this.config.identityBaseUrl}/api/v1/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers,
      });

      if (await this.isCsrfFailure(response)) {
        const freshXsrf = await this.ensureAntiforgeryToken(true);
        if (freshXsrf) {
          headers['X-XSRF-TOKEN'] = freshXsrf;
          response = await fetch(`${this.config.identityBaseUrl}/api/v1/auth/logout`, {
            method: 'POST',
            credentials: 'include',
            headers,
          });
        }
      }

      remoteRevoked = response.ok;
      if (!remoteRevoked) {
        console.warn('La sesión local fue cerrada, pero no se pudo confirmar la revocación remota en el servidor (HTTP ' + response.status + ').');
      }
    } catch (err) {
      console.warn('Error de red durante logout; la sesión remota no pudo ser confirmada revocada.', err);
    } finally {
      this.accessToken = null;
      this.contextState.set(null);
      await this.router.navigateByUrl('/login');
    }
    return { remoteRevoked };
  }

  async refreshAccessToken(): Promise<boolean> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }
    this.refreshPromise = this.performRefresh().finally(() => {
      this.refreshPromise = null;
    });
    return this.refreshPromise;
  }

  private async isCsrfFailure(response: Response): Promise<boolean> {
    if (response.status !== 400) {
      return false;
    }
    if (response.headers.get('x-cobroup-error') === 'antiforgery_token_invalid') {
      return true;
    }
    try {
      const cloned = response.clone();
      const payload = await cloned.json();
      return payload?.error === 'antiforgery_token_invalid' || payload?.code === 'antiforgery_token_invalid';
    } catch {
      return false;
    }
  }

  private async performRefresh(): Promise<boolean> {
    try {
      const xsrf = await this.ensureAntiforgeryToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (xsrf) {
        headers['X-XSRF-TOKEN'] = xsrf;
      }

      let response = await fetch(`${this.config.identityBaseUrl}/api/v1/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers,
      });

      if (await this.isCsrfFailure(response)) {
        const freshXsrf = await this.ensureAntiforgeryToken(true);
        if (freshXsrf) {
          headers['X-XSRF-TOKEN'] = freshXsrf;
          response = await fetch(`${this.config.identityBaseUrl}/api/v1/auth/refresh`, {
            method: 'POST',
            credentials: 'include',
            headers,
          });
        }
      }

      if (!response.ok) {
        this.accessToken = null;
        this.contextState.set(null);
        return false;
      }

      const tokens = (await response.json()) as { access_token: string };
      this.accessToken = tokens.access_token;
      await this.loadContext();
      return true;
    } catch {
      this.accessToken = null;
      this.contextState.set(null);
      return false;
    }
  }

  async authorizedFetch(input: string, init: RequestInit = {}): Promise<Response> {
    if (!this.accessToken) {
      const refreshed = await this.refreshAccessToken();
      if (!refreshed || !this.accessToken) {
        throw new Error('La sesión operativa no está disponible.');
      }
    }
    const execute = () => {
      const headers = new Headers(init.headers);
      headers.set('Authorization', `Bearer ${this.accessToken}`);
      return fetch(input, { ...init, headers });
    };
    let response = await execute();
    if (response.status === 401 && await this.refreshAccessToken()) {
      response = await execute();
    }
    return response;
  }

  private async loadContext(): Promise<void> {
    if (!this.accessToken) throw new Error('No hay access token disponible.');
    const response = await fetch(this.config.contextEndpoint, {
      headers: { Authorization: `Bearer ${this.accessToken}` }
    });
    if (!response.ok) throw new Error('El token no contiene un contexto de organización válido.');
    this.contextState.set((await response.json()) as AuthContext);
  }
}
