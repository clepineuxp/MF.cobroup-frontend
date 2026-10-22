import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service';
import { AUTH_CONFIG } from './auth.config';

describe('AuthService Antiforgery and Refresh', () => {
  let service: AuthService;
  let mockRouter: { navigateByUrl: ReturnType<typeof vi.fn> };
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockRouter = { navigateByUrl: vi.fn().mockResolvedValue(true) };
    fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: Router, useValue: mockRouter },
        {
          provide: AUTH_CONFIG,
          useValue: {
            clientId: 'cobroup-operational-spa',
            identityBaseUrl: '/identity',
            contextEndpoint: '/api/operations/v1/session/me',
          },
        },
      ],
    });
  });

  it('fetches antiforgery token with credentials include and Cache-Control no-store', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ requestToken: 'test-antiforgery-token' }),
    });

    service = TestBed.inject(AuthService);
    const token = await service.ensureAntiforgeryToken();

    expect(token).toBe('test-antiforgery-token');
    expect(fetchSpy).toHaveBeenCalledWith('/identity/api/v1/auth/antiforgery', expect.objectContaining({
      method: 'GET',
      credentials: 'include',
      headers: { 'Cache-Control': 'no-store' },
    }));
  });

  it('sends X-XSRF-TOKEN on refresh request', async () => {
    // 1. Antiforgery call
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ requestToken: 'csrf-123' }),
    });
    // 2. Refresh call
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'new-jwt-access' }),
    });
    // 3. LoadContext call
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ userId: 'u-1', organizationId: 'org-1' }),
    });

    service = TestBed.inject(AuthService);
    const refreshed = await service.refreshAccessToken();

    expect(refreshed).toBe(true);
    expect(fetchSpy).toHaveBeenCalledWith('/identity/api/v1/auth/refresh', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
      headers: expect.objectContaining({
        'X-XSRF-TOKEN': 'csrf-123',
      }),
    }));
  });

  it('deduplicates concurrent refresh calls into a single in-flight request', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ requestToken: 'csrf-dedup' }),
    });
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'jwt-single-flight' }),
    });
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ userId: 'u-1' }),
    });

    service = TestBed.inject(AuthService);
    const [res1, res2] = await Promise.all([
      service.refreshAccessToken(),
      service.refreshAccessToken(),
    ]);

    expect(res1).toBe(true);
    expect(res2).toBe(true);
    const refreshCalls = fetchSpy.mock.calls.filter((c: unknown[]) => c[0] === '/identity/api/v1/auth/refresh');
    expect(refreshCalls.length).toBe(1);
  });

  it('sends X-XSRF-TOKEN on logout', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ requestToken: 'csrf-logout' }),
    });
    fetchSpy.mockResolvedValueOnce({
      ok: true,
    });

    service = TestBed.inject(AuthService);
    const result = await service.logout();

    expect(result.remoteRevoked).toBe(true);
    expect(fetchSpy).toHaveBeenCalledWith('/identity/api/v1/auth/logout', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
      headers: expect.objectContaining({
        'X-XSRF-TOKEN': 'csrf-logout',
      }),
    }));
    expect(mockRouter.navigateByUrl).toHaveBeenCalledWith('/login');
  });

  it('retries with fresh CSRF token only when response is explicit antiforgery error', async () => {
    // 1. Initial antiforgery
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ requestToken: 'expired-csrf' }),
    });
    // 2. Refresh returns 400 with antiforgery error
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 400,
      headers: new Headers({ 'x-cobroup-error': 'antiforgery_token_invalid' }),
      clone: () => ({
        json: async () => ({ error: 'antiforgery_token_invalid', code: 'antiforgery_token_invalid' }),
      }),
      json: async () => ({ error: 'antiforgery_token_invalid', code: 'antiforgery_token_invalid' }),
    });
    // 3. Fresh antiforgery
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ requestToken: 'new-csrf' }),
    });
    // 4. Retry succeeds
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'valid-jwt' }),
    });
    // 5. Load context
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ userId: 'u-1' }),
    });

    service = TestBed.inject(AuthService);
    const success = await service.refreshAccessToken();

    expect(success).toBe(true);
    const refreshCalls = fetchSpy.mock.calls.filter((c: unknown[]) => c[0] === '/identity/api/v1/auth/refresh');
    expect(refreshCalls.length).toBe(2);
    expect(refreshCalls[1][1].headers['X-XSRF-TOKEN']).toBe('new-csrf');
  });

  it('does NOT retry when HTTP 400 is a generic validation error', async () => {
    // 1. Initial antiforgery
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ requestToken: 'csrf-1' }),
    });
    // 2. Refresh returns generic 400 (e.g. model validation error)
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 400,
      headers: new Headers(),
      clone: () => ({
        json: async () => ({ message: 'Validation failed' }),
      }),
      json: async () => ({ message: 'Validation failed' }),
    });

    service = TestBed.inject(AuthService);
    const success = await service.refreshAccessToken();

    expect(success).toBe(false);
    const refreshCalls = fetchSpy.mock.calls.filter((c: unknown[]) => c[0] === '/identity/api/v1/auth/refresh');
    expect(refreshCalls.length).toBe(1);
  });
});
