import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, inject, signal } from '@angular/core';
import { LocationPickerComponent, SelectedCoordinates } from '../location-picker/location-picker.component';
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
  imports: [CommonModule, FormsModule, LocationPickerComponent],
  templateUrl: './customer-modal.component.html',
  styleUrl: './customer-modal.component.scss',
})
export class CustomerModalComponent implements OnChanges, OnDestroy {
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
  readonly gpsIndex = signal<number | null>(null);
  readonly gpsMessage = signal('');
  readonly gpsError = signal('');
  readonly mapLocation = signal<CustomerLocation | null>(null);
  private gpsRequest = 0;
  private gpsTimer: ReturnType<typeof setTimeout> | null = null;

  readonly isAdmin = signal(false);

  draft: CustomerDraft = this.emptyDraft();

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if (changes['isOpen'] && !this.isOpen) this.cancelLocationWork();
    if (changes['isOpen'] && this.isOpen) {
      await this.initModal();
    }
  }

  async initModal(): Promise<void> {
    this.cancelLocationWork();
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
    this.cancelLocationWork();
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
    if (this.gpsIndex() !== null || this.mapLocation()) return;
    if (this.draft.locations.length < 4) {
      this.draft.locations.push(this.emptyLocation(false));
    }
  }

  removeLocation(index: number): void {
    if (this.gpsIndex() !== null || this.mapLocation()) return;
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
    if (this.gpsIndex() !== null || this.saving() || this.mapLocation()) return;
    const target = this.draft.locations[index];
    if (!target) return;
    this.gpsMessage.set(''); this.gpsError.set('');
    if (!navigator.geolocation) {
      this.gpsError.set('Este navegador no ofrece GPS. Selecciona la ubicación en el mapa o ingresa las coordenadas.');
      return;
    }
    const request = ++this.gpsRequest;
    this.gpsIndex.set(index);
    const finish = (coordinates: SelectedCoordinates | null, message = '') => {
      if (request !== this.gpsRequest) return;
      this.gpsRequest++;
      if (this.gpsTimer !== null) clearTimeout(this.gpsTimer);
      this.gpsTimer = null; this.gpsIndex.set(null);
      if (!this.isOpen || !this.draft.locations.includes(target)) return;
      if (coordinates && Number.isFinite(coordinates.latitude) && Number.isFinite(coordinates.longitude)
          && coordinates.latitude >= -90 && coordinates.latitude <= 90 && coordinates.longitude >= -180 && coordinates.longitude <= 180) {
        Object.assign(target, { latitude: Number(coordinates.latitude.toFixed(6)), longitude: Number(coordinates.longitude.toFixed(6)), source: 'Gps' });
        this.gpsMessage.set('Ubicación actual obtenida correctamente.');
      } else this.gpsError.set(message || 'El GPS devolvió coordenadas inválidas. Intenta de nuevo o usa el mapa.');
    };
    this.gpsTimer = setTimeout(() => finish(null, 'El GPS tardó demasiado en responder. Intenta de nuevo o selecciona la ubicación en el mapa.'), 12000);
    try {
      navigator.geolocation.getCurrentPosition(
        (position) => finish({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
        (error) => finish(null, error.code === 1 ? 'Permiso de ubicación denegado. Habilítalo o selecciona la ubicación en el mapa.'
          : error.code === 3 ? 'Se agotó el tiempo de espera del GPS. Intenta de nuevo o usa el mapa.' : 'No fue posible obtener la ubicación GPS. Intenta de nuevo o usa el mapa.'),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
    } catch { finish(null, 'No fue posible iniciar el GPS. Selecciona la ubicación en el mapa.'); }
  }

  openMap(index: number): void {
    if (this.gpsIndex() !== null || this.saving()) return;
    this.mapLocation.set(this.draft.locations[index] ?? null);
  }
  initialMapCoordinates(): SelectedCoordinates | null {
    const point = this.mapLocation();
    return point && Number.isFinite(point.latitude) && Number.isFinite(point.longitude)
      && point.latitude >= -90 && point.latitude <= 90 && point.longitude >= -180 && point.longitude <= 180
      ? { latitude: point.latitude, longitude: point.longitude } : null;
  }
  confirmMap(point: SelectedCoordinates): void {
    const target = this.mapLocation();
    if (target && this.draft.locations.includes(target)) {
      Object.assign(target, point, { source: 'Manual' });
      this.gpsError.set(''); this.gpsMessage.set('Ubicación seleccionada en el mapa correctamente.');
    }
    this.mapLocation.set(null);
  }
  private cancelLocationWork(): void {
    this.gpsRequest++;
    if (this.gpsTimer !== null) clearTimeout(this.gpsTimer);
    this.gpsTimer = null; this.gpsIndex.set(null); this.mapLocation.set(null);
    this.gpsMessage.set(''); this.gpsError.set('');
  }
  ngOnDestroy(): void { this.cancelLocationWork(); }

  async save(): Promise<void> {
    if (this.gpsIndex() !== null || this.mapLocation() || this.saving() || this.loading()) return;
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
          !Number.isFinite(location.latitude) || !Number.isFinite(location.longitude) || location.latitude < -90 ||
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
    return { latitude: Number.NaN, longitude: Number.NaN, alias: '', address: '', isPrimary, source: 'Manual' };
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
