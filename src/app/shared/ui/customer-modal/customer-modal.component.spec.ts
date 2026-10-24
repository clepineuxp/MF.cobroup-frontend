import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { CustomerModalComponent } from './customer-modal.component';
import { CustomersService } from '../../../features/customers/data/customers.service';
import { RoutesService } from '../../../features/routes/data/routes.service';
import { AuthService } from '../../../core/auth/auth.service';

describe('CustomerModalComponent', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
  const customersService = {
    get: vi.fn().mockResolvedValue({
      id: 'cust-1',
      routeId: 'route-1',
      firstNames: 'Carlos',
      lastNames: 'Restrepo',
      businessOrWorkName: 'Ferretería',
      observations: '',
      status: 'Active' as const,
      phones: [{ number: '3119876543', isPrimary: true }],
      locations: [{ latitude: 4.65, longitude: -74.05, alias: 'Sede Principal', address: 'Calle 100', isPrimary: true, source: 'Manual' as const }],
    }),
    create: vi.fn().mockResolvedValue({ id: 'cust-created' }),
    update: vi.fn().mockResolvedValue({ id: 'cust-1' }),
  };

  const routesService = {
    listAccessible: vi.fn().mockResolvedValue([
      { id: 'route-1', name: 'Ruta 1', description: null, accessAs: 'Collector' },
    ]),
  };

  const authService = {
    context: signal({
      userId: 'user-1',
      organizationId: 'org-1',
      organizationCode: 'ORG',
      role: 'Collector' as const,
      displayName: 'Cobrador',
    }).asReadonly(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    await TestBed.configureTestingModule({
      imports: [CustomerModalComponent],
      providers: [
        { provide: CustomersService, useValue: customersService },
        { provide: RoutesService, useValue: routesService },
        { provide: AuthService, useValue: authService },
      ],
    }).compileComponents();
  });

  it('initializes draft and loads routes when modal is opened', async () => {
    const fixture = TestBed.createComponent(CustomerModalComponent);
    const comp = fixture.componentInstance;
    comp.isOpen = true;
    await comp.initModal();
    fixture.detectChanges();

    expect(routesService.listAccessible).toHaveBeenCalled();
    expect(comp.routes()).toHaveLength(1);
    expect(comp.draft.phones).toHaveLength(1);
  });

  it('loads customer details when customerId is provided', async () => {
    const fixture = TestBed.createComponent(CustomerModalComponent);
    const comp = fixture.componentInstance;
    comp.isOpen = true;
    comp.customerId = 'cust-1';
    await comp.initModal();
    fixture.detectChanges();

    expect(customersService.get).toHaveBeenCalledWith('cust-1');
    expect(comp.draft.firstNames).toBe('Carlos');
    expect(comp.draft.lastNames).toBe('Restrepo');
  });

  it('validates and creates a new customer', async () => {
    const fixture = TestBed.createComponent(CustomerModalComponent);
    const comp = fixture.componentInstance;
    comp.isOpen = true;
    await comp.initModal();

    comp.draft.routeId = 'route-1';
    comp.draft.firstNames = 'Laura';
    comp.draft.lastNames = 'Mejía';
    comp.draft.phones[0].number = '3001234567';
    comp.draft.locations[0].latitude = 4.7;
    comp.draft.locations[0].longitude = -74.1;

    let savedId = '';
    comp.customerSaved.subscribe((id) => (savedId = id));

    await comp.save();

    expect(customersService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        routeId: 'route-1',
        firstNames: 'Laura',
        lastNames: 'Mejía',
      })
    );
    expect(savedId).toBe('cust-created');
  });

  it('blocks saving while GPS is pending and shows success after applying coordinates', async () => {
    let resolve!: PositionCallback;
    vi.stubGlobal('navigator', { userAgent: 'Vitest', geolocation: { getCurrentPosition: vi.fn((callback) => { resolve = callback; }) } });
    const fixture = TestBed.createComponent(CustomerModalComponent);
    const comp = fixture.componentInstance; comp.isOpen = true; await comp.initModal();
    comp.useCurrentLocation(0); fixture.detectChanges();
    expect(comp.gpsIndex()).toBe(0);
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Cargando GPS');
    await comp.save(); expect(customersService.create).not.toHaveBeenCalled();
    resolve({ coords: { latitude: 4.71234567, longitude: -74.12345678 } } as GeolocationPosition);
    fixture.detectChanges();
    expect(comp.gpsIndex()).toBeNull();
    expect(comp.draft.locations[0]).toMatchObject({ latitude: 4.712346, longitude: -74.123457, source: 'Gps' });
    expect(comp.gpsMessage()).toContain('correctamente');
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(false);
  });

  it('shows denied permission without overwriting existing coordinates', async () => {
    let reject!: PositionErrorCallback;
    vi.stubGlobal('navigator', { userAgent: 'Vitest', geolocation: { getCurrentPosition: vi.fn((_success, failure) => { reject = failure; }) } });
    const comp = TestBed.createComponent(CustomerModalComponent).componentInstance;
    comp.isOpen = true; await comp.initModal(); comp.draft.locations[0].latitude = 4.7;
    comp.useCurrentLocation(0); reject({ code: 1 } as GeolocationPositionError);
    expect(comp.gpsError()).toContain('denegado');
    expect(comp.gpsIndex()).toBeNull(); expect(comp.draft.locations[0].latitude).toBe(4.7);
  });

  it('expires an unresponsive GPS request and ignores its late success', async () => {
    let resolve!: PositionCallback;
    vi.stubGlobal('navigator', { userAgent: 'Vitest', geolocation: { getCurrentPosition: vi.fn((callback) => { resolve = callback; }) } });
    const comp = TestBed.createComponent(CustomerModalComponent).componentInstance;
    comp.isOpen = true; await comp.initModal(); vi.useFakeTimers();
    comp.useCurrentLocation(0); vi.advanceTimersByTime(12001);
    expect(comp.gpsIndex()).toBeNull(); expect(comp.gpsError()).toContain('demasiado');
    resolve({ coords: { latitude: 10, longitude: 20 } } as GeolocationPosition);
    expect(Number.isNaN(comp.draft.locations[0].latitude)).toBe(true);
  });

  it('ignores GPS callbacks after closing and reopening the form', async () => {
    let resolve!: PositionCallback;
    vi.stubGlobal('navigator', { userAgent: 'Vitest', geolocation: { getCurrentPosition: vi.fn((callback) => { resolve = callback; }) } });
    const comp = TestBed.createComponent(CustomerModalComponent).componentInstance;
    comp.isOpen = true; await comp.initModal(); comp.useCurrentLocation(0);
    comp.close(); await comp.initModal();
    resolve({ coords: { latitude: 10, longitude: 20 } } as GeolocationPosition);
    expect(Number.isNaN(comp.draft.locations[0].latitude)).toBe(true); expect(comp.gpsMessage()).toBe('');
  });

  it('keeps map changes provisional until confirmed and preserves other location fields', async () => {
    const comp = TestBed.createComponent(CustomerModalComponent).componentInstance;
    comp.isOpen = true; await comp.initModal();
    comp.draft.locations[0].alias = 'Casa'; comp.openMap(0);
    expect(Number.isNaN(comp.draft.locations[0].latitude)).toBe(true);
    comp.mapLocation.set(null); expect(Number.isNaN(comp.draft.locations[0].latitude)).toBe(true);
    comp.openMap(0); comp.confirmMap({ latitude: 4.7, longitude: -74.1 });
    expect(comp.draft.locations[0]).toMatchObject({ latitude: 4.7, longitude: -74.1, alias: 'Casa', source: 'Manual', isPrimary: true });
    expect(comp.mapLocation()).toBeNull(); expect(comp.gpsMessage()).toContain('mapa');
  });

  it('offers manual capture when GPS is unavailable and rejects empty coordinates', async () => {
    vi.stubGlobal('navigator', { userAgent: 'Vitest' });
    const comp = TestBed.createComponent(CustomerModalComponent).componentInstance; comp.isOpen = true; await comp.initModal();
    comp.useCurrentLocation(0); expect(comp.gpsError()).toContain('no ofrece GPS'); expect(comp.gpsIndex()).toBeNull();
    comp.draft.routeId = 'route-1'; comp.draft.firstNames = 'Ana'; comp.draft.lastNames = 'Pérez'; comp.draft.phones[0].number = '3001234567';
    await comp.save(); expect(customersService.create).not.toHaveBeenCalled(); expect(comp.error()).toContain('coordenadas válidas');
  });
});
