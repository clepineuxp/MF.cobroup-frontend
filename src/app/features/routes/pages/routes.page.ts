import { Component, inject, signal } from '@angular/core';
import { AccessibleRoute } from '../data/route.models';
import { RoutesService } from '../data/routes.service';

@Component({
  selector: 'app-routes-page',
  templateUrl: './routes.page.html',
  styleUrl: './routes.page.scss',
})
export class RoutesPage {
  private readonly routesService = inject(RoutesService);
  readonly routes = signal<readonly AccessibleRoute[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');

  constructor() { void this.load(); }

  private async load(): Promise<void> {
    try {
      this.routes.set(await this.routesService.listAccessible());
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No fue posible consultar tus rutas.');
    } finally {
      this.loading.set(false);
    }
  }
}
