import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  { path: 'machine-auth', canActivate: [authGuard], loadComponent: () => import('./features/machine-auth/pages/machine-auth.page').then((module) => module.MachineAuthPage), title: 'Autorizar dispositivo | COBROUP' },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./features/agenda/pages/mapa.page').then((module) => module.MapaPage),
    title: 'Cobro UP',
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
  {
    path: 'balance-ruta',
    canActivate: [authGuard],
    loadComponent: () => import('./features/route-finances/pages/route-finance.page').then((module) => module.RouteFinancePage),
    title: 'Balance Ruta | COBROUP',
  },
  {
    path: 'ingresos-inversiones',
    redirectTo: 'balance-ruta',
  },
  {
    path: 'gastos',
    redirectTo: 'balance-ruta',
  },
  {
    path: 'agenda',
    canActivate: [authGuard],
    loadComponent: () => import('./features/agenda/pages/agenda.page').then((module) => module.AgendaPage),
    title: 'Agenda diaria | COBROUP',
  },
  {
    path: 'mapa',
    canActivate: [authGuard],
    loadComponent: () => import('./features/agenda/pages/mapa.page').then((module) => module.MapaPage),
    title: 'Mapa de ruta | COBROUP',
  },
  { path: 'login', loadComponent: () => import('./features/auth/pages/login.page').then((module) => module.LoginPage), title: 'Acceso operativo | COBROUP' },
  { path: '**', redirectTo: '' },
];
