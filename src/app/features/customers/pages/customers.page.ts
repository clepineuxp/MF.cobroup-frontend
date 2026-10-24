import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { AccessibleRoute } from '../../routes/data/route.models';
import { RoutesService } from '../../routes/data/routes.service';
import { CustomerDetails, CustomerLocation, CustomerPhone, CustomerStatus, CustomerSummary, CustomerWriteRequest } from '../data/customer.models';
import { CustomersService } from '../data/customers.service';
import { CustomerModalComponent } from '../../../shared/ui/customer-modal/customer-modal.component';

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
  imports: [CommonModule, FormsModule, CustomerModalComponent],
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

  readonly statusFilter = signal<'all' | 'Active' | 'Inactive'>('all');
  readonly activeCount = computed(() => this.customers().filter((c) => c.status === 'Active').length);
  readonly inactiveCount = computed(() => this.customers().filter((c) => c.status === 'Inactive').length);
  readonly filteredCustomers = computed(() => {
    const filter = this.statusFilter();
    const list = this.customers();
    if (filter === 'all') return list;
    return list.filter((c) => c.status === filter);
  });

  filterRouteId = '';
  searchTerm = '';
  draft = this.emptyDraft();

  constructor() { void this.initialize(); }

  setStatusFilter(status: 'all' | 'Active' | 'Inactive'): void {
    this.statusFilter.set(status);
  }

  clearSearch(): void {
    this.searchTerm = '';
    void this.search();
  }

  getInitials(firstNames?: string, lastNames?: string): string {
    const f = (firstNames || '').trim().charAt(0);
    const l = (lastNames || '').trim().charAt(0);
    return (f + l).toUpperCase() || 'CL';
  }

  getAvatarGradient(seed: string): string {
    const gradients = [
      'linear-gradient(135deg, #2563eb, #1d4ed8)', // Blue
      'linear-gradient(135deg, #059669, #047857)', // Emerald
      'linear-gradient(135deg, #7c3aed, #6d28d9)', // Violet
      'linear-gradient(135deg, #d97706, #b45309)', // Amber
      'linear-gradient(135deg, #db2777, #be185d)', // Pink
      'linear-gradient(135deg, #0891b2, #0e7490)', // Cyan
      'linear-gradient(135deg, #4f46e5, #4338ca)', // Indigo
      'linear-gradient(135deg, #0d9488, #0f766e)', // Teal
    ];
    let hash = 0;
    const str = seed || 'CobroUP';
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % gradients.length;
    return gradients[idx];
  }

  getMapUrl(lat: number, lng: number): string {
    if (!lat && !lng) return 'https://www.google.com/maps';
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }

  getTelUrl(phone?: string): string {
    if (!phone) return '#';
    const cleaned = phone.replace(/[^0-9+]/g, '');
    return `tel:${cleaned}`;
  }

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

  onCustomerSaved(): void {
    this.closeForm();
    void this.search();
  }

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
