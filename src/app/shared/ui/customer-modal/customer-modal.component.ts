import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, inject, signal } from '@angular/core';
import { LocationPickerComponent, SelectedCoordinates } from '../location-picker/location-picker.component';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { AccessibleRoute } from '../../../features/routes/data/route.models';
import { RoutesService } from '../../../features/routes/data/routes.service';
import {
  CustomerDetails,
  CustomerEvidence,
  CustomerLocation,
  CustomerPhone,
  CustomerStatus,
  CustomerWriteRequest,
} from '../../../features/customers/data/customer.models';
import { CustomersService } from '../../../features/customers/data/customers.service';
import { AvailableLoanTemplate } from '../../../features/loan-templates/data/loan-template.models';
import { LoanTemplatesService } from '../../../features/loan-templates/data/loan-templates.service';
import { CalculatedSchedule, PaymentFrequency } from '../../../features/loans/data/loan.models';
import { LoansService } from '../../../features/loans/data/loans.service';

export interface CustomerDraft {
  identification: string;
  id: string | null;
  routeId: string;
  firstNames: string;
  lastNames: string;
  businessOrWorkName: string;
  observations: string;
  status: CustomerStatus;
  phones: CustomerPhone[];
  locations: CustomerLocation[];
  evidence: CustomerEvidence | null;
}

export interface CreditDraft {
  loanTemplateId: string;
  principalAmount: number | null;
  interestRate: number | null;
  paymentFrequency: PaymentFrequency;
  frequencyNDays: number | null;
  installmentCount: number | null;
  startDate: string;
}

@Component({
  selector: 'app-customer-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, LocationPickerComponent, CurrencyPipe],
  templateUrl: './customer-modal.component.html',
  styleUrl: './customer-modal.component.scss',
})
export class CustomerModalComponent implements OnChanges, OnDestroy {
  @Input() isOpen = false;
  @Input() customerId: string | null = null;
  @Input() defaultRouteId = '';
  @Input() hideRoute = false;

  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly customerSaved = new EventEmitter<string>();

  private readonly customersService = inject(CustomersService);
  private readonly routesService = inject(RoutesService);
  private readonly templatesService = inject(LoanTemplatesService);
  private readonly loansService = inject(LoansService);
  private readonly auth = inject(AuthService);

  readonly routes = signal<readonly AccessibleRoute[]>([]);
  readonly templates = signal<readonly AvailableLoanTemplate[]>([]);
  readonly schedulePreview = signal<CalculatedSchedule | null>(null);
  readonly previewing = signal(false);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly success = signal('');
  readonly gpsIndex = signal<number | null>(null);
  readonly gpsMessage = signal('');
  readonly gpsError = signal('');
  readonly selectedEvidence = signal<File | null>(null);
  readonly evidencePreviewUrl = signal<string | null>(null);
  readonly evidenceViewing = signal(false);
  readonly mapLocation = signal<CustomerLocation | null>(null);
  private gpsRequest = 0;
  private gpsTimer: ReturnType<typeof setTimeout> | null = null;

  readonly isAdmin = signal(false);

  draft: CustomerDraft = this.emptyDraft();
  creditDraft: CreditDraft = this.emptyCreditDraft();
  fullName = '';
  private originalIdentification = '';

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if (changes['isOpen'] && !this.isOpen) this.cancelLocationWork();
    if (changes['isOpen'] && this.isOpen) {
      await this.initModal();
    }
  }

  async initModal(): Promise<void> {
    this.cancelLocationWork();
    this.clearEvidencePreview();
    this.selectedEvidence.set(null);
    this.fullName = '';
    this.originalIdentification = '';
    this.error.set('');
    this.success.set('');
    this.loading.set(true);
    this.isAdmin.set(this.auth.context()?.role === 'Admin');

    try {
      const [routesList, templatesList] = await Promise.all([
        this.routesService.listAccessible(),
        this.templatesService.listAvailable().catch(() => []),
      ]);
      this.routes.set(routesList);
      this.templates.set(templatesList);
      this.creditDraft = this.emptyCreditDraft();
      this.schedulePreview.set(null);

      if (this.customerId) {
        const customer = await this.customersService.get(this.customerId);
        this.draft = this.fromDetails(customer);
        this.originalIdentification = customer.identification;
        this.fullName = `${customer.firstNames} ${customer.lastNames}`.trim();
      } else {
        this.draft = this.emptyDraft();
        this.draft.routeId = this.defaultRouteId || routesList[0]?.id || '';
        if (this.availableTemplates.length === 1) {
          this.creditDraft.loanTemplateId = this.availableTemplates[0].id;
        }
      }
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Error al inicializar formulario.');
    } finally {
      this.loading.set(false);
    }
  }

  get availableTemplates(): readonly AvailableLoanTemplate[] {
    const routeId = this.draft.routeId || this.defaultRouteId;
    return routeId ? this.templates().filter((t) => t.routeIds.includes(routeId)) : this.templates();
  }

  onRouteChanged(): void {
    this.creditDraft.loanTemplateId = '';
    if (this.availableTemplates.length === 1) {
      this.creditDraft.loanTemplateId = this.availableTemplates[0].id;
    }
    void this.calculateCreditPreview();
  }

  onCreditTemplateChanged(): void {
    this.error.set('');
    void this.calculateCreditPreview();
  }

  get creditTemplateLimitsError(): string {
    if (!this.creditDraft.principalAmount && !this.creditDraft.interestRate && !this.creditDraft.installmentCount) {
      return '';
    }
    const template = this.availableTemplates.find((t) => t.id === this.creditDraft.loanTemplateId);
    if (!template) {
      return 'Debe seleccionar una plantilla para asignar el crédito.';
    }
    if (this.creditDraft.principalAmount !== null) {
      if (this.creditDraft.principalAmount < template.minPrincipalAmount || this.creditDraft.principalAmount > template.maxPrincipalAmount) {
        return `El monto debe estar entre ${template.minPrincipalAmount} y ${template.maxPrincipalAmount}.`;
      }
    }
    if (this.creditDraft.interestRate !== null) {
      if (this.creditDraft.interestRate < template.minPercentage || this.creditDraft.interestRate > template.maxPercentage) {
        return `El interés debe estar entre ${template.minPercentage}% y ${template.maxPercentage}%.`;
      }
    }
    return '';
  }

  async calculateCreditPreview(): Promise<void> {
    const c = this.creditDraft;
    if (!c.principalAmount || c.principalAmount <= 0 || c.interestRate === null || c.interestRate < 0 || !c.installmentCount || c.installmentCount <= 0 || !c.startDate) {
      this.schedulePreview.set(null);
      return;
    }
    if (c.paymentFrequency === 'EveryNDays' && (!c.frequencyNDays || c.frequencyNDays <= 0)) {
      this.schedulePreview.set(null);
      return;
    }
    this.previewing.set(true);
    try {
      const schedule = await this.loansService.previewSchedule({
        principalAmount: c.principalAmount,
        interestRate: c.interestRate,
        paymentFrequency: c.paymentFrequency,
        frequencyNDays: c.paymentFrequency === 'EveryNDays' ? c.frequencyNDays : null,
        installmentCount: c.installmentCount,
        startDate: c.startDate,
      });
      this.schedulePreview.set(schedule);
    } catch {
      this.schedulePreview.set(null);
    } finally {
      this.previewing.set(false);
    }
  }

  close(): void {
    this.cancelLocationWork();
    this.clearEvidencePreview();
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

  selectEvidence(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) {
      this.error.set('La evidencia debe ser JPEG, PNG o WebP y no superar 10 MB.');
      return;
    }
    this.error.set('');
    this.clearEvidencePreview();
    this.selectedEvidence.set(file);
    this.evidencePreviewUrl.set(URL.createObjectURL(file));
  }

  clearSelectedEvidence(): void {
    this.selectedEvidence.set(null);
    this.clearEvidencePreview();
  }

  async viewExistingEvidence(): Promise<void> {
    if (!this.draft.id || !this.draft.evidence || this.evidenceViewing()) return;
    this.evidenceViewing.set(true);
    try {
      const blob = await this.customersService.downloadEvidence(this.draft.id);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'No fue posible abrir la evidencia.');
    } finally {
      this.evidenceViewing.set(false);
    }
  }

  async save(): Promise<void> {
    if (this.gpsIndex() !== null || this.mapLocation() || this.saving() || this.loading()) return;
    if (!this.isValid()) return;

    const isAssigningCredit = !this.draft.id && this.creditDraft.principalAmount !== null && this.creditDraft.principalAmount > 0;
    if (isAssigningCredit) {
      if (!this.creditDraft.loanTemplateId) {
        this.error.set('Debe seleccionar una plantilla para asignar el crédito.');
        return;
      }
      if (this.creditDraft.interestRate === null || this.creditDraft.interestRate < 0) {
        this.error.set('La tasa de interés del crédito es obligatoria.');
        return;
      }
      if (!this.creditDraft.installmentCount || this.creditDraft.installmentCount < 1) {
        this.error.set('El número de cuotas del crédito es obligatorio.');
        return;
      }
      if (!this.creditDraft.startDate) {
        this.error.set('La fecha de inicio del crédito es obligatoria.');
        return;
      }
      if (this.creditDraft.paymentFrequency === 'EveryNDays' && (!this.creditDraft.frequencyNDays || this.creditDraft.frequencyNDays < 1)) {
        this.error.set('El intervalo en días es obligatorio para pagos cada N días.');
        return;
      }
      if (this.creditTemplateLimitsError) {
        this.error.set(this.creditTemplateLimitsError);
        return;
      }
    }

    this.saving.set(true);
    this.error.set('');
    this.success.set('');

    const request: CustomerWriteRequest = {
      routeId: this.draft.routeId,
      identification: this.draft.identification.trim(),
      ...this.customerNameParts()!,
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
        if (this.selectedEvidence()) await this.customersService.uploadEvidence(this.draft.id, this.selectedEvidence()!);
      } else {
        const created = await this.customersService.create(request);
        savedId = created.id;
        this.draft.id = created.id;
        if (this.selectedEvidence()) await this.customersService.uploadEvidence(created.id, this.selectedEvidence()!);

        if (isAssigningCredit) {
          const template = this.availableTemplates.find(t => t.id === this.creditDraft.loanTemplateId);
          await this.loansService.originate({
            customerId: created.id,
            principalAmount: this.creditDraft.principalAmount!,
            interestRate: this.creditDraft.interestRate!,
            paymentFrequency: this.creditDraft.paymentFrequency,
            frequencyNDays: this.creditDraft.paymentFrequency === 'EveryNDays' ? this.creditDraft.frequencyNDays : null,
            installmentCount: this.creditDraft.installmentCount!,
            loanTemplateId: template?.id ?? null,
            loanTemplateVersion: template?.version ?? null,
            startDate: this.creditDraft.startDate,
          });
        }
      }
      this.success.set(isAssigningCredit ? 'Cliente y crédito creados exitosamente.' : this.draft.id ? 'Cliente actualizado.' : 'Cliente creado.');
      this.customerSaved.emit(savedId ?? '');
      this.close();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'No fue posible guardar el cliente.');
    } finally {
      this.saving.set(false);
    }
  }

  private customerNameParts(): { firstNames: string; lastNames: string } | null {
    const fullName = this.fullName.trim().replace(/\s+/g, ' ');
    const original = `${this.draft.firstNames} ${this.draft.lastNames}`.trim().replace(/\s+/g, ' ');
    if (this.draft.firstNames.trim() && this.draft.lastNames.trim() && fullName === original)
      return { firstNames: this.draft.firstNames.trim(), lastNames: this.draft.lastNames.trim() };
    // Adapt the single UI field to the existing API without dropping or duplicating words.
    const separators = [...fullName.matchAll(/ /g)].map(match => match.index!);
    const split = separators.reverse().find(index => index <= 120 && fullName.length - index - 1 <= 120);
    if (split === undefined) return null;
    return { firstNames: fullName.slice(0, split), lastNames: fullName.slice(split + 1) };
  }

  private isValid(): boolean {
    const identification = this.draft.identification.trim();
    if (!identification || identification.length > 64 || (identification === '0' && (!this.draft.id || this.originalIdentification !== '0'))) {
      this.error.set('La identificación es obligatoria. El valor 0 solo se conserva en clientes antiguos.');
      return false;
    }
    if (!this.draft.routeId || !this.fullName.trim()) {
      this.error.set('Ruta y alias son obligatorios.');
      return false;
    }
    if (!this.customerNameParts()) {
      this.error.set('El alias debe conservar el formato actual y no superar la longitud permitida.');
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
      identification: '',
      id: null,
      routeId: '',
      firstNames: '',
      lastNames: '',
      businessOrWorkName: '',
      observations: '',
      status: 'Active',
      phones: [{ number: '', isPrimary: true }],
      locations: [this.emptyLocation(true)],
      evidence: null,
    };
  }

  private emptyLocation(isPrimary: boolean): CustomerLocation {
    return { latitude: Number.NaN, longitude: Number.NaN, alias: '', address: '', isPrimary, source: 'Manual' };
  }

  private fromDetails(customer: CustomerDetails): CustomerDraft {
    return {
      identification: customer.identification,
      id: customer.id,
      routeId: customer.routeId,
      firstNames: customer.firstNames,
      lastNames: customer.lastNames,
      businessOrWorkName: customer.businessOrWorkName ?? '',
      observations: customer.observations ?? '',
      status: customer.status,
      phones: customer.phones.map((p) => ({ ...p })),
      locations: customer.locations.map((l) => ({ ...l })),
      evidence: customer.evidence,
    };
  }

  private clearEvidencePreview(): void {
    const url = this.evidencePreviewUrl();
    if (url) URL.revokeObjectURL(url);
    this.evidencePreviewUrl.set(null);
  }

  private todayDate(): string {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private emptyCreditDraft(): CreditDraft {
    return {
      loanTemplateId: '',
      principalAmount: null,
      interestRate: null,
      paymentFrequency: 'Daily',
      frequencyNDays: null,
      installmentCount: null,
      startDate: this.todayDate(),
    };
  }
}
