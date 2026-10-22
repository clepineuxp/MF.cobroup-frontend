import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AccessibleRoute } from '../../routes/data/route.models';
import { RoutesService } from '../../routes/data/routes.service';
import { AgendaItem, AgendaResponse } from '../data/agenda.models';
import { AgendaService } from '../data/agenda.service';

export type StatusFilter = 'ALL' | 'OVERDUE' | 'DUE_TODAY' | 'COLLECTED';

@Component({
  selector: 'app-agenda-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CurrencyPipe],
  templateUrl: './agenda.page.html',
  styleUrl: './agenda.page.scss',
})
export class AgendaPage implements OnInit {
  private readonly agendaService = inject(AgendaService);
  private readonly routesService = inject(RoutesService);
  private readonly router = inject(Router);

  readonly routes = signal<readonly AccessibleRoute[]>([]);
  readonly agenda = signal<AgendaResponse | null>(null);
  readonly loading = signal(false);
  readonly optimizing = signal(false);
  readonly error = signal('');
  readonly activeFilter = signal<StatusFilter>('ALL');

  readonly filterForm = new FormGroup({
    routeId: new FormControl<string>('', { nonNullable: true }),
    date: new FormControl<string>(new Date().toISOString().substring(0, 10), { nonNullable: true }),
  });

  readonly filteredItems = computed(() => {
    const resp = this.agenda();
    if (!resp) return [];
    const filter = this.activeFilter();
    switch (filter) {
      case 'OVERDUE':
        return resp.items.filter((i) => i.status === 'Overdue');
      case 'DUE_TODAY':
        return resp.items.filter((i) => i.status === 'DueToday');
      case 'COLLECTED':
        return resp.items.filter((i) => i.status === 'Collected');
      default:
        return resp.items;
    }
  });

  async ngOnInit(): Promise<void> {
    await this.loadRoutes();
  }

  async loadRoutes(): Promise<void> {
    try {
      this.loading.set(true);
      const accessibleRoutes = await this.routesService.listAccessible();
      this.routes.set(accessibleRoutes);
      if (accessibleRoutes.length > 0) {
        this.filterForm.patchValue({ routeId: accessibleRoutes[0].id });
        await this.loadAgenda();
      }
    } catch (err: unknown) {
      this.error.set(err instanceof Error ? err.message : 'Error cargando las rutas.');
    } finally {
      this.loading.set(false);
    }
  }

  async loadAgenda(): Promise<void> {
    const routeId = this.filterForm.controls.routeId.value;
    const date = this.filterForm.controls.date.value;
    if (!routeId) return;

    try {
      this.loading.set(true);
      this.error.set('');
      const data = await this.agendaService.getAgenda(routeId, date);
      this.agenda.set(data);
    } catch (err: unknown) {
      this.error.set(err instanceof Error ? err.message : 'Error al consultar la agenda.');
    } finally {
      this.loading.set(false);
    }
  }

  setFilter(filter: StatusFilter): void {
    this.activeFilter.set(filter);
  }

  async optimizeGps(): Promise<void> {
    if (!navigator.geolocation) {
      this.error.set('La geolocalización no está soportada en este navegador.');
      return;
    }

    this.optimizing.set(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const routeId = this.filterForm.controls.routeId.value;
          const date = this.filterForm.controls.date.value;
          const data = await this.agendaService.optimizeSequence(
            pos.coords.latitude,
            pos.coords.longitude,
            routeId,
            date,
          );
          this.agenda.set(data);
        } catch (err: unknown) {
          this.error.set(err instanceof Error ? err.message : 'Error al optimizar la ruta.');
        } finally {
          this.optimizing.set(false);
        }
      },
      (err) => {
        this.optimizing.set(false);
        this.error.set(`Permiso de ubicación denegado: ${err.message}`);
      },
      { timeout: 10000, enableHighAccuracy: true },
    );
  }

  goToCollect(item: AgendaItem): void {
    if (item.activeLoanId) {
      this.router.navigate(['/prestamos'], { queryParams: { loanId: item.activeLoanId } });
    } else {
      this.router.navigate(['/clientes'], { queryParams: { customerId: item.customerId } });
    }
  }
}
