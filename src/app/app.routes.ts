import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./features/operations-overview/pages/operations-overview.page').then((module) => module.OperationsOverviewPage),
    title: 'Resumen operativo | COBROUP',
  },
  {
    path: 'rutas',
    canActivate: [authGuard],
    loadComponent: () => import('./features/routes/pages/routes.page').then((module) => module.RoutesPage),
    title: 'Mis rutas | COBROUP',
  },
  { path: 'login', loadComponent: () => import('./features/auth/pages/login.page').then((module) => module.LoginPage), title: 'Acceso operativo | COBROUP' },
  { path: 'auth/callback', loadComponent: () => import('./features/auth/pages/auth-callback.page').then((module) => module.AuthCallbackPage), title: 'Validando acceso | COBROUP' },
  { path: '**', redirectTo: '' },
];
