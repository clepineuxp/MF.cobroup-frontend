import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/operations-overview/pages/operations-overview.page').then((module) => module.OperationsOverviewPage),
    title: 'Resumen operativo | COBROUP',
  },
  { path: '**', redirectTo: '' },
];
