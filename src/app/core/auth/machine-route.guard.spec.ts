import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MachineAuthService } from '../../features/machine-auth/data/machine-auth.service';
import { RoutesService } from '../../features/routes/data/routes.service';
import { AuthService } from './auth.service';
import { machineRouteGuard } from './machine-route.guard';

describe('machineRouteGuard', () => {
  let mockAuth: { isAuthenticated: ReturnType<typeof vi.fn> };
  let mockRoutes: { listAccessible: ReturnType<typeof vi.fn> };
  let mockMachineAuth: { refreshAuthorizedRouteAccess: ReturnType<typeof vi.fn> };
  let mockRouter: { createUrlTree: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockAuth = { isAuthenticated: vi.fn().mockReturnValue(true) };
    mockRoutes = { listAccessible: vi.fn() };
    mockMachineAuth = { refreshAuthorizedRouteAccess: vi.fn() };
    mockRouter = { createUrlTree: vi.fn().mockReturnValue('/machine-auth-url-tree') };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuth },
        { provide: RoutesService, useValue: mockRoutes },
        { provide: MachineAuthService, useValue: mockMachineAuth },
        { provide: Router, useValue: mockRouter },
      ],
    });
  });

  it('allows access when at least one assigned route is authorized on this machine', async () => {
    mockMachineAuth.refreshAuthorizedRouteAccess.mockResolvedValue(true);

    const result = await TestBed.runInInjectionContext(() => machineRouteGuard({} as any, {} as any));

    expect(result).toBe(true);
    expect(mockMachineAuth.refreshAuthorizedRouteAccess).toHaveBeenCalled();
  });

  it('redirects to machine authorization when no route is authorized', async () => {
    mockMachineAuth.refreshAuthorizedRouteAccess.mockResolvedValue(false);

    const result = await TestBed.runInInjectionContext(() => machineRouteGuard({} as any, {} as any));

    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/machine-auth']);
    expect(result).toBe('/machine-auth-url-tree');
  });

  it('redirects to login when the session is not authenticated', async () => {
    mockAuth.isAuthenticated.mockReturnValue(false);

    const result = await TestBed.runInInjectionContext(() => machineRouteGuard({} as any, {} as any));

    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/login']);
    expect(result).toBe('/machine-auth-url-tree');
    expect(mockRoutes.listAccessible).not.toHaveBeenCalled();
  });
});
