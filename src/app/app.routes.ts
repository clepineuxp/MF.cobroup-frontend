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
  {
    path: 'plantillas',
    canActivate: [authGuard],
    loadComponent: () => import('./features/loan-templates/pages/loan-templates.page').then((module) => module.LoanTemplatesPage),
    title: 'Plantillas disponibles | COBROUP',
  },
  {
    path: 'excepciones',
    canActivate: [authGuard],
    loadComponent: () => import('./features/loan-exceptions/pages/loan-exceptions.page').then((module) => module.LoanExceptionsPage),
    title: 'Excepciones de crédito | COBROUP',
  },
  {
    path: 'clientes',
    canActivate: [authGuard],
    loadComponent: () => import('./features/customers/pages/customers.page').then((module) => module.CustomersPage),
    title: 'Clientes | COBROUP',
  },
  {
    path: 'prestamos',
    canActivate: [authGuard],
    loadComponent: () => import('./features/loans/pages/loans.page').then((module) => module.LoansPage),
    title: 'Préstamos y cronogramas | COBROUP',
  },
  {
    path: 'conciliacion',
    canActivate: [authGuard],
    loadComponent: () => import('./features/payments/pages/reconciliation/reconciliation.page').then((module) => module.ReconciliationPage),
    title: 'Conciliación diaria | COBROUP',
  },
  { path: 'login', loadComponent: () => import('./features/auth/pages/login.page').then((module) => module.LoginPage), title: 'Acceso operativo | COBROUP' },
  { path: 'auth/callback', loadComponent: () => import('./features/auth/pages/auth-callback.page').then((module) => module.AuthCallbackPage), title: 'Validando acceso | COBROUP' },
  { path: '**', redirectTo: '' },
];
