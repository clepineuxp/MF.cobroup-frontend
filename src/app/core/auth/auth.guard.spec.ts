import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authGuard } from './auth.guard';
import { AuthService } from './auth.service';

describe('authGuard', () => {
  let mockAuth: {
    isAuthenticated: ReturnType<typeof vi.fn>;
    refreshAccessToken: ReturnType<typeof vi.fn>;
  };
  let mockRouter: {
    createUrlTree: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockAuth = {
      isAuthenticated: vi.fn(),
      refreshAccessToken: vi.fn(),
    };
    mockRouter = {
      createUrlTree: vi.fn().mockReturnValue('/login-url-tree'),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuth },
        { provide: Router, useValue: mockRouter },
      ],
    });
  });

  it('allows activation if already authenticated', async () => {
    mockAuth.isAuthenticated.mockReturnValue(true);

    const result = await TestBed.runInInjectionContext(() =>
      authGuard({} as any, {} as any)
    );

    expect(result).toBe(true);
  });

  it('redirects to /login if not authenticated and refresh fails', async () => {
    mockAuth.isAuthenticated.mockReturnValue(false);
    mockAuth.refreshAccessToken.mockResolvedValue(false);

    const result = await TestBed.runInInjectionContext(() =>
      authGuard({} as any, {} as any)
    );

    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/login']);
    expect(result).toBe('/login-url-tree');
  });
});
