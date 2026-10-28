import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { MachineAuthService } from '../../features/machine-auth/data/machine-auth.service';
import { AuthService } from './auth.service';

/**
 * Restricts route-dependent modules to sessions with at least one
 * machine-authorized route. The machine authorization remains route-specific,
 * so checking the assigned routes here avoids granting access from a stale
 * selected-route value.
 */
export const machineRouteGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const machineAuth = inject(MachineAuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }

  const authorized = await machineAuth.refreshAuthorizedRouteAccess();
  return authorized ? true : router.createUrlTree(['/machine-auth']);
};
