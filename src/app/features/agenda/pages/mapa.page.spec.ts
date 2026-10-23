import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { MapaPage } from './mapa.page';
import { AgendaService } from '../data/agenda.service';
import { RoutesService } from '../../routes/data/routes.service';
import { LoansService } from '../../loans/data/loans.service';
import { CustomersService } from '../../customers/data/customers.service';
import { LoanTemplatesService } from '../../loan-templates/data/loan-templates.service';
import { LoanExceptionsService } from '../../loan-exceptions/data/loan-exceptions.service';
import { PaymentsService } from '../../payments/data/payments.service';
import { AuthService } from '../../../core/auth/auth.service';

describe('MapaPage (Home Screen)', () => {
  const routesService = {
    listAccessible: vi.fn().mockResolvedValue([
      { id: 'route-1', name: 'Ruta Centro 1', description: null, accessAs: 'Collector' },
      { id: 'route-2', name: 'Ruta Norte 2', description: null, accessAs: 'Collector' },
    ]),
  };

  const agendaService = {
    getMapLocations: vi.fn().mockResolvedValue([
      {
        customerId: 'cust-1',
        customerName: 'Juan Valdez',
        businessOrWorkName: 'Cafetería El Sol',
        address: 'Calle 10 # 5-20',
        latitude: 4.61,
        longitude: -74.08,
        activeLoanId: 'loan-1',
        loanBalance: 120000,
        dueTodayAmount: 15000,
        overdueAmount: 0,
        status: 'DueToday',
        markerColor: '#EAB308',
      },
      {
        customerId: 'cust-2',
        customerName: 'María Pérez',
        businessOrWorkName: 'Salón Bellas',
        address: 'Cra 15 # 30-10',
        latitude: 4.62,
        longitude: -74.07,
        activeLoanId: null,
        loanBalance: 0,
        dueTodayAmount: 0,
        overdueAmount: 0,
        status: 'Collected',
        markerColor: '#10B981',
      },
    ]),
  };

  const loansService = {
    get: vi.fn().mockResolvedValue({
      id: 'loan-1',
      customerId: 'cust-1',
      customerName: 'Juan Valdez',
      balanceAmount: 120000,
      status: 'Active',
      installments: [{ number: 1, expectedAmount: 15000, paidAmount: 0, status: 'Pending' }],
    }),
    listByCustomer: vi.fn().mockResolvedValue([]),
    search: vi.fn().mockResolvedValue({ items: [], page: 1, pageSize: 25, totalCount: 0 }),
  };

  const customersService = {
    search: vi.fn().mockResolvedValue({ items: [], page: 1, pageSize: 100, totalCount: 0 }),
    get: vi.fn(),
  };

  const templatesService = {
    listAvailable: vi.fn().mockResolvedValue([]),
  };

  const exceptionsService = {
    search: vi.fn().mockResolvedValue({ items: [], page: 1, pageSize: 100, totalCount: 0 }),
  };

  const paymentsService = {
    getPaymentMethods: vi.fn().mockResolvedValue([{ id: 'pm-1', name: 'Efectivo' }]),
  };

  const authService = {
    context: signal({
      userId: 'user-1',
      organizationId: 'tenant-1',
      organizationCode: 'COBROUP',
      role: 'Collector' as const,
      displayName: 'Cobrador',
    }).asReadonly(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    await TestBed.configureTestingModule({
      imports: [MapaPage],
      providers: [
        { provide: RoutesService, useValue: routesService },
        { provide: AgendaService, useValue: agendaService },
        { provide: LoansService, useValue: loansService },
        { provide: CustomersService, useValue: customersService },
        { provide: LoanTemplatesService, useValue: templatesService },
        { provide: LoanExceptionsService, useValue: exceptionsService },
        { provide: PaymentsService, useValue: paymentsService },
        { provide: AuthService, useValue: authService },
      ],
    }).compileComponents();
  });

  it('automatically selects the first available route and loads map points (Requirement 2.5.1)', async () => {
    const fixture = TestBed.createComponent(MapaPage);
    await fixture.whenStable();
    fixture.detectChanges();

    const page = fixture.componentInstance;
    expect(routesService.listAccessible).toHaveBeenCalled();
    expect(page.selectedRouteId()).toBe('route-1');
    expect(agendaService.getMapLocations).toHaveBeenCalledWith('route-1');
    expect(page.mapPoints()).toHaveLength(2);
  });

  it('filters map points when filter option is selected (Requirement 2.5.2)', async () => {
    const fixture = TestBed.createComponent(MapaPage);
    await fixture.whenStable();
    fixture.detectChanges();

    const page = fixture.componentInstance;
    expect(page.mapPoints()).toHaveLength(2);

    page.setFilter('DUE');
    fixture.detectChanges();
    expect(page.mapPoints()).toHaveLength(1);
    expect(page.mapPoints()[0].customerId).toBe('cust-1');

    page.setFilter('COLLECTED');
    fixture.detectChanges();
    expect(page.mapPoints()).toHaveLength(1);
    expect(page.mapPoints()[0].customerId).toBe('cust-2');
  });

  it('enables Cobrar only when customer with loan is selected (Requirement 2.8)', async () => {
    const fixture = TestBed.createComponent(MapaPage);
    const page = fixture.componentInstance;
    await page.loadRoutes();
    fixture.detectChanges();

    expect(page.canCollect()).toBe(false);

    // Select customer with active loan
    expect(page.mapPoints().length).toBeGreaterThan(0);
    const pointWithLoan = page.mapPoints()[0];
    await page.onPointSelected(pointWithLoan);
    fixture.detectChanges();

    expect(page.selectedPoint()).toBeTruthy();
    expect(loansService.get).toHaveBeenCalledWith('loan-1');
    expect(page.canCollect()).toBe(true);

    // Open collect modal
    page.openCollect();
    expect(page.isPaymentModalOpen()).toBe(true);
    expect(page.payingLoan()?.id).toBe('loan-1');
  });

  it('disables Cobrar when selected customer has no active loan', async () => {
    const fixture = TestBed.createComponent(MapaPage);
    const page = fixture.componentInstance;
    await page.loadRoutes();
    fixture.detectChanges();

    const pointWithoutLoan = page.mapPoints()[1];
    await page.onPointSelected(pointWithoutLoan);
    fixture.detectChanges();

    expect(page.canCollect()).toBe(false);
  });

  it('opens Nuevo Prestamo and Nuevo Cliente modals (Requirements 2.6, 2.7)', async () => {
    const fixture = TestBed.createComponent(MapaPage);
    await fixture.whenStable();
    fixture.detectChanges();

    const page = fixture.componentInstance;

    page.openNewLoan();
    expect(page.isOriginationModalOpen()).toBe(true);

    page.openNewCustomer();
    expect(page.isCustomerModalOpen()).toBe(true);
  });
});
