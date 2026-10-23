import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { CustomerModalComponent } from './customer-modal.component';
import { CustomersService } from '../../../features/customers/data/customers.service';
import { RoutesService } from '../../../features/routes/data/routes.service';
import { AuthService } from '../../../core/auth/auth.service';

describe('CustomerModalComponent', () => {
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
});
