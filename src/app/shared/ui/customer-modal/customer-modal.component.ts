import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { AccessibleRoute } from '../../../features/routes/data/route.models';
import { RoutesService } from '../../../features/routes/data/routes.service';
import {
  CustomerDetails,
  CustomerLocation,
  CustomerPhone,
  CustomerStatus,
  CustomerWriteRequest,
} from '../../../features/customers/data/customer.models';
import { CustomersService } from '../../../features/customers/data/customers.service';

export interface CustomerDraft {
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
  selector: 'app-customer-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './customer-modal.component.html',
  styleUrl: './customer-modal.component.scss',
})
export class CustomerModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() customerId: string | null = null;
  @Input() defaultRouteId = '';

  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly customerSaved = new EventEmitter<string>();

  private readonly customersService = inject(CustomersService);
  private readonly routesService = inject(RoutesService);
  private readonly auth = inject(AuthService);

  readonly routes = signal<readonly AccessibleRoute[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly success = signal('');

  readonly isAdmin = signal(false);

  draft: CustomerDraft = this.emptyDraft();

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if (changes['isOpen'] && this.isOpen) {
      await this.initModal();
    }
  }

  async initModal(): Promise<void> {
    this.error.set('');
    this.success.set('');
    this.loading.set(true);
    this.isAdmin.set(this.auth.context()?.role === 'Admin');

    try {
      const routesList = await this.routesService.listAccessible();
      this.routes.set(routesList);

      if (this.customerId) {
        const customer = await this.customersService.get(this.customerId);
        this.draft = this.fromDetails(customer);
      } else {
        this.draft = this.emptyDraft();
        this.draft.routeId = this.defaultRouteId || routesList[0]?.id || '';
      }
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Error al inicializar formulario.');
    } finally {
      this.loading.set(false);
    }
  }

  close(): void {
    this.closed.emit();
  }

  addPhone(): void {
    if (this.draft.phones.length < 6) {
      this.draft.phones.push({ number: '', isPrimary: false });
    }
  }

  removePhone(index: number): void {
    if (this.draft.phones.length === 1) return;
    const wasPrimary = this.draft.phones[index].isPrimary;
    this.draft.phones.splice(index, 1);
    if (wasPrimary) {
      this.draft.phones[0].isPrimary = true;
    }
  }

  setPrimaryPhone(index: number): void {
    this.draft.phones.forEach((phone, current) => {
      phone.isPrimary = current === index;
    });
  }

  addLocation(): void {
    if (this.draft.locations.length < 4) {
      this.draft.locations.push(this.emptyLocation(false));
    }
  }

  removeLocation(index: number): void {
    if (this.draft.locations.length === 1) return;
    const wasPrimary = this.draft.locations[index].isPrimary;
    this.draft.locations.splice(index, 1);
    if (wasPrimary) {
      this.draft.locations[0].isPrimary = true;
    }
  }

  setPrimaryLocation(index: number): void {
    this.draft.locations.forEach((location, current) => {
      location.isPrimary = current === index;
    });
  }

  useCurrentLocation(index: number): void {
    if (!navigator.geolocation) {
      this.error.set('Este navegador no ofrece geolocalización. Ingresa las coordenadas manualmente.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.draft.locations[index].latitude = Number(position.coords.latitude.toFixed(6));
        this.draft.locations[index].longitude = Number(position.coords.longitude.toFixed(6));
        this.draft.locations[index].source = 'Gps';
        this.error.set('');
      },
      () => this.error.set('No fue posible obtener la ubicación GPS.'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async save(): Promise<void> {
    if (!this.isValid()) return;

    this.saving.set(true);
    this.error.set('');
    this.success.set('');

    const request: CustomerWriteRequest = {
      routeId: this.draft.routeId,
      firstNames: this.draft.firstNames.trim(),
      lastNames: this.draft.lastNames.trim(),
      businessOrWorkName: this.draft.businessOrWorkName.trim() || null,
      observations: this.draft.observations.trim() || null,
      status: this.draft.status,
      phones: this.draft.phones.map((phone) => ({ number: phone.number.trim(), isPrimary: phone.isPrimary })),
      locations: this.draft.locations.map((loc) => ({
        ...loc,
        alias: loc.alias?.trim() || null,
        address: loc.address?.trim() || null,
      })),
    };

    try {
      let savedId = this.draft.id;
      if (this.draft.id) {
        await this.customersService.update(this.draft.id, request);
      } else {
        const created = await this.customersService.create(request);
        savedId = created.id;
      }
      this.success.set(this.draft.id ? 'Cliente actualizado.' : 'Cliente creado.');
      this.customerSaved.emit(savedId ?? '');
      this.close();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'No fue posible guardar el cliente.');
    } finally {
      this.saving.set(false);
    }
  }

  private isValid(): boolean {
    if (!this.draft.routeId || !this.draft.firstNames.trim() || !this.draft.lastNames.trim()) {
      this.error.set('Ruta, nombres y apellidos son obligatorios.');
      return false;
    }
    if (
      this.draft.phones.some((phone) => !phone.number.trim()) ||
      this.draft.phones.filter((phone) => phone.isPrimary).length !== 1
    ) {
      this.error.set('Cada teléfono debe tener número y exactamente uno debe ser principal.');
      return false;
    }
    if (
      this.draft.locations.filter((location) => location.isPrimary).length !== 1 ||
      this.draft.locations.some(
        (location) =>
          location.latitude < -90 ||
          location.latitude > 90 ||
          location.longitude < -180 ||
          location.longitude > 180
      )
    ) {
      this.error.set('Cada ubicación debe tener coordenadas válidas y exactamente una debe ser principal.');
      return false;
    }
    return true;
  }

  private emptyDraft(): CustomerDraft {
    return {
      id: null,
      routeId: '',
      firstNames: '',
      lastNames: '',
      businessOrWorkName: '',
      observations: '',
      status: 'Active',
      phones: [{ number: '', isPrimary: true }],
      locations: [this.emptyLocation(true)],
    };
  }

  private emptyLocation(isPrimary: boolean): CustomerLocation {
    return { latitude: 0, longitude: 0, alias: '', address: '', isPrimary, source: 'Manual' };
  }

  private fromDetails(customer: CustomerDetails): CustomerDraft {
    return {
      id: customer.id,
      routeId: customer.routeId,
      firstNames: customer.firstNames,
      lastNames: customer.lastNames,
      businessOrWorkName: customer.businessOrWorkName ?? '',
      observations: customer.observations ?? '',
      status: customer.status,
      phones: customer.phones.map((p) => ({ ...p })),
      locations: customer.locations.map((l) => ({ ...l })),
    };
  }
}
