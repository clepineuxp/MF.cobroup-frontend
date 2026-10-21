import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { AccessibleRoute } from '../../routes/data/route.models';
import { RoutesService } from '../../routes/data/routes.service';
import { CustomerDetails, CustomerLocation, CustomerPhone, CustomerStatus, CustomerSummary, CustomerWriteRequest } from '../data/customer.models';
import { CustomersService } from '../data/customers.service';

interface CustomerDraft {
  id: string | null;
  routeId: string;
  firstNames: string;
  lastNames: string;
  businessOrWorkName: string;
  observations: string;
  status: CustomerStatus;
  phones: CustomerPhone[];
  locations: CustomerLocation[];
}

@Component({
  selector: 'app-customers-page',
  imports: [FormsModule],
  templateUrl: './customers.page.html',
  styleUrl: './customers.page.scss',
})
export class CustomersPage {
  private readonly customersService = inject(CustomersService);
  private readonly routesService = inject(RoutesService);
  private readonly auth = inject(AuthService);
  readonly customers = signal<readonly CustomerSummary[]>([]);
  readonly routes = signal<readonly AccessibleRoute[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly success = signal('');
  readonly formOpen = signal(false);
  readonly totalCount = signal(0);
  readonly isAdmin = computed(() => this.auth.context()?.role === 'Admin');
  filterRouteId = '';
  searchTerm = '';
  draft = this.emptyDraft();

  constructor() { void this.initialize(); }

  async search(): Promise<void> {
    this.loading.set(true); this.error.set('');
    try {
      const page = await this.customersService.search(this.filterRouteId, this.searchTerm);
      this.customers.set(page.items); this.totalCount.set(page.totalCount);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No fue posible consultar los clientes.');
    } finally { this.loading.set(false); }
  }

  openCreate(): void {
    this.draft = this.emptyDraft();
    this.draft.routeId = this.filterRouteId || this.routes()[0]?.id || '';
    this.formOpen.set(true); this.error.set(''); this.success.set('');
  }

  async openEdit(customerId: string): Promise<void> {
    this.error.set(''); this.success.set('');
    try {
      const customer = await this.customersService.get(customerId);
      this.draft = this.fromDetails(customer); this.formOpen.set(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) { this.error.set(error instanceof Error ? error.message : 'No fue posible consultar el cliente.'); }
  }

  closeForm(): void { this.formOpen.set(false); }

  addPhone(): void {
    if (this.draft.phones.length < 6) this.draft.phones.push({ number: '', isPrimary: false });
  }

  removePhone(index: number): void {
    if (this.draft.phones.length === 1) return;
    const wasPrimary = this.draft.phones[index].isPrimary;
    this.draft.phones.splice(index, 1);
    if (wasPrimary) this.draft.phones[0].isPrimary = true;
  }

  setPrimaryPhone(index: number): void { this.draft.phones.forEach((phone, current) => phone.isPrimary = current === index); }

  addLocation(): void {
    if (this.draft.locations.length < 4) this.draft.locations.push(this.emptyLocation(false));
  }

  removeLocation(index: number): void {
    if (this.draft.locations.length === 1) return;
    const wasPrimary = this.draft.locations[index].isPrimary;
    this.draft.locations.splice(index, 1);
    if (wasPrimary) this.draft.locations[0].isPrimary = true;
  }

  setPrimaryLocation(index: number): void { this.draft.locations.forEach((location, current) => location.isPrimary = current === index); }

  useCurrentLocation(index: number): void {
    if (!navigator.geolocation) { this.error.set('Este navegador no ofrece geolocalización. Puedes ingresar las coordenadas manualmente.'); return; }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.draft.locations[index].latitude = Number(position.coords.latitude.toFixed(6));
        this.draft.locations[index].longitude = Number(position.coords.longitude.toFixed(6));
        this.draft.locations[index].source = 'Gps';
        this.error.set('');
      },
      () => this.error.set('No fue posible obtener la ubicación. Puedes seleccionarla manualmente.'),
      { enableHighAccuracy: true, timeout: 10000 });
  }

  async save(): Promise<void> {
    if (!this.isValid()) return;
    this.saving.set(true); this.error.set(''); this.success.set('');
    const request: CustomerWriteRequest = {
      routeId: this.draft.routeId,
      firstNames: this.draft.firstNames.trim(),
      lastNames: this.draft.lastNames.trim(),
      businessOrWorkName: this.draft.businessOrWorkName.trim() || null,
      observations: this.draft.observations.trim() || null,
      status: this.draft.status,
      phones: this.draft.phones.map((phone) => ({ number: phone.number.trim(), isPrimary: phone.isPrimary })),
      locations: this.draft.locations.map((location) => ({ ...location, alias: location.alias?.trim() || null, address: location.address?.trim() || null })),
    };
    try {
      if (this.draft.id) await this.customersService.update(this.draft.id, request);
      else await this.customersService.create(request);
      this.success.set(this.draft.id ? 'Cliente actualizado.' : 'Cliente creado.');
      this.formOpen.set(false); await this.search();
    } catch (error) { this.error.set(error instanceof Error ? error.message : 'No fue posible guardar el cliente.'); }
    finally { this.saving.set(false); }
  }

  routeName(routeId: string): string { return this.routes().find((route) => route.id === routeId)?.name ?? 'Ruta no disponible'; }

  private async initialize(): Promise<void> {
    try { this.routes.set(await this.routesService.listAccessible()); }
    catch (error) { this.error.set(error instanceof Error ? error.message : 'No fue posible consultar tus rutas.'); }
    await this.search();
  }

  private isValid(): boolean {
    if (!this.draft.routeId || !this.draft.firstNames.trim() || !this.draft.lastNames.trim()) {
      this.error.set('Ruta, nombres y apellidos son obligatorios.'); return false;
    }
    if (this.draft.phones.some((phone) => !phone.number.trim()) || this.draft.phones.filter((phone) => phone.isPrimary).length !== 1) {
      this.error.set('Cada teléfono debe tener número y exactamente uno debe ser principal.'); return false;
    }
    if (this.draft.locations.filter((location) => location.isPrimary).length !== 1
      || this.draft.locations.some((location) => location.latitude < -90 || location.latitude > 90 || location.longitude < -180 || location.longitude > 180)) {
      this.error.set('Cada ubicación debe tener coordenadas válidas y exactamente una debe ser principal.'); return false;
    }
    return true;
  }

  private emptyDraft(): CustomerDraft {
    return { id: null, routeId: '', firstNames: '', lastNames: '', businessOrWorkName: '', observations: '', status: 'Active',
      phones: [{ number: '', isPrimary: true }], locations: [this.emptyLocation(true)] };
  }

  private emptyLocation(isPrimary: boolean): CustomerLocation {
    return { latitude: 0, longitude: 0, alias: '', address: '', isPrimary, source: 'Manual' };
  }

  private fromDetails(customer: CustomerDetails): CustomerDraft {
    return { id: customer.id, routeId: customer.routeId, firstNames: customer.firstNames, lastNames: customer.lastNames,
      businessOrWorkName: customer.businessOrWorkName ?? '', observations: customer.observations ?? '', status: customer.status,
      phones: customer.phones.map((phone) => ({ ...phone })), locations: customer.locations.map((location) => ({ ...location })) };
  }
}
