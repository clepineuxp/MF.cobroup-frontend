import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../../core/auth/auth.service';
import { RoutesService } from '../../routes/data/routes.service';
import { CustomersService } from '../data/customers.service';
import { CustomersPage } from './customers.page';

describe('CustomersPage', () => {
  const customer = {
    id: 'customer-1', routeId: 'route-1', identification: '001234567', firstNames: 'Ana', lastNames: 'Pérez', businessOrWorkName: 'Taller',
    primaryPhone: '3001112233', primaryLatitude: 4.711, primaryLongitude: -74.072, status: 'Active' as const,
    updatedAtUtc: '2026-10-21T00:00:00Z',
  };
  const customersService = {
    search: vi.fn().mockResolvedValue({ items: [customer], page: 1, pageSize: 25, totalCount: 1 }),
    get: vi.fn(), create: vi.fn(), update: vi.fn(),
  };
  const routesService = {
    listAccessible: vi.fn().mockResolvedValue([{
      id: 'route-1', name: 'Centro', description: null, accessAs: 'Collector', maxActiveCustomers: 3, maxActiveLoans: null,
    }]),
  };
  const context = signal({ userId: 'user-1', organizationId: 'tenant-1', organizationCode: 'COBROUP', username: 'collector', displayName: 'Collector', role: 'Collector' as const });

  beforeEach(async () => {
    vi.clearAllMocks();
    customersService.search.mockResolvedValue({ items: [customer], page: 1, pageSize: 25, totalCount: 1 });
    await TestBed.configureTestingModule({
      imports: [CustomersPage],
      providers: [
        { provide: CustomersService, useValue: customersService },
        { provide: RoutesService, useValue: routesService },
        { provide: AuthService, useValue: { context: context.asReadonly() } },
      ],
    }).compileComponents();
  });

  it('renders only customers returned by the scoped API', async () => {
    const fixture = TestBed.createComponent(CustomersPage);
    await fixture.whenStable(); fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Ana Pérez');
    expect(fixture.nativeElement.textContent).toContain('Centro');
    expect(fixture.nativeElement.textContent).toContain('3001112233');
  });

  it('enforces the six phone limit in the form', async () => {
    const fixture = TestBed.createComponent(CustomersPage);
    await fixture.whenStable();
    const page = fixture.componentInstance;
    page.openCreate();

    for (let index = 0; index < 8; index += 1) page.addPhone();

    expect(page.draft.phones).toHaveLength(6);
  });

  it('creates a customer with one primary phone and location', async () => {
    customersService.create.mockResolvedValue({ id: 'customer-2' });
    const fixture = TestBed.createComponent(CustomersPage);
    await fixture.whenStable();
    const page = fixture.componentInstance;
    page.openCreate();
    page.draft.identification = '001234567'; page.draft.firstNames = 'Luis'; page.draft.lastNames = 'Díaz'; page.draft.phones[0].number = '3002223344';
    page.draft.locations[0].latitude = 4.7; page.draft.locations[0].longitude = -74.1;

    await page.save();

    expect(customersService.create).toHaveBeenCalledWith(expect.objectContaining({ routeId: 'route-1', identification: '001234567', firstNames: 'Luis' }));
  });
});
