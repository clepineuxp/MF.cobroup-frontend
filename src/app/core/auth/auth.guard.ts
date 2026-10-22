import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  if (auth.isAuthenticated()) {
    return true;
  }
  const restored = await auth.refreshAccessToken();
  return restored ? true : inject(Router).createUrlTree(['/login']);
};
