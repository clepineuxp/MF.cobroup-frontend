import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MapPoint, MapViewComponent } from '../../../shared/ui/map-view/map-view.component';
import { AccessibleRoute } from '../../routes/data/route.models';
import { RoutesService } from '../../routes/data/routes.service';
import { CustomerMapLocation } from '../data/agenda.models';
import { AgendaService } from '../data/agenda.service';

@Component({
  selector: 'app-mapa-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MapViewComponent, CurrencyPipe],
  templateUrl: './mapa.page.html',
  styleUrl: './mapa.page.scss',
})
export class MapaPage implements OnInit {
  private readonly agendaService = inject(AgendaService);
  private readonly routesService = inject(RoutesService);
  private readonly router = inject(Router);

  readonly routes = signal<readonly AccessibleRoute[]>([]);
  readonly rawLocations = signal<readonly CustomerMapLocation[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly selectedPoint = signal<MapPoint | null>(null);
  readonly statusFilter = signal<'ALL' | 'OVERDUE' | 'DUE' | 'COLLECTED'>('ALL');

  readonly filterForm = new FormGroup({
    routeId: new FormControl<string>('', { nonNullable: true }),
    date: new FormControl<string>(new Date().toISOString().substring(0, 10), { nonNullable: true }),
  });

  readonly mapPoints = computed<MapPoint[]>(() => {
    const list = this.rawLocations();
    const filter = this.statusFilter();

    return list
      .filter((loc) => {
        if (filter === 'OVERDUE') return loc.status === 'Overdue';
        if (filter === 'DUE') return loc.status === 'DueToday';
        if (filter === 'COLLECTED') return loc.status === 'Collected';
        return true;
      })
      .map((loc) => ({
        customerId: loc.customerId,
        customerName: loc.customerName,
        businessOrWorkName: loc.businessOrWorkName,
        address: loc.address,
        latitude: loc.latitude,
        longitude: loc.longitude,
        status: loc.status,
        markerColor: loc.markerColor,
        dueTodayAmount: loc.dueTodayAmount,
        overdueAmount: loc.overdueAmount,
        loanBalance: loc.loanBalance,
      }));
  });

  readonly moraCount = computed(() => this.rawLocations().filter((l) => l.status === 'Overdue').length);
  readonly dueCount = computed(() => this.rawLocations().filter((l) => l.status === 'DueToday').length);
  readonly collectedCount = computed(() => this.rawLocations().filter((l) => l.status === 'Collected').length);

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
        await this.loadMapLocations();
      }
    } catch (err: unknown) {
      this.error.set(err instanceof Error ? err.message : 'Error cargando las rutas.');
    } finally {
      this.loading.set(false);
    }
  }

  async loadMapLocations(): Promise<void> {
    const routeId = this.filterForm.controls.routeId.value;
    const date = this.filterForm.controls.date.value;
    if (!routeId) return;

    try {
      this.loading.set(true);
      this.error.set('');
      const data = await this.agendaService.getMapLocations(routeId, date);
      this.rawLocations.set(data);
      this.selectedPoint.set(null);
    } catch (err: unknown) {
      this.error.set(err instanceof Error ? err.message : 'Error al consultar puntos del mapa.');
    } finally {
      this.loading.set(false);
    }
  }

  onPointSelected(point: MapPoint): void {
    this.selectedPoint.set(point);
  }

  setFilter(filter: 'ALL' | 'OVERDUE' | 'DUE' | 'COLLECTED'): void {
    this.statusFilter.set(filter);
  }

  goToCollect(point: MapPoint): void {
    const raw = this.rawLocations().find((l) => l.customerId === point.customerId);
    if (raw?.activeLoanId) {
      this.router.navigate(['/prestamos'], { queryParams: { loanId: raw.activeLoanId } });
    } else {
      this.router.navigate(['/clientes'], { queryParams: { customerId: point.customerId } });
    }
  }
}
