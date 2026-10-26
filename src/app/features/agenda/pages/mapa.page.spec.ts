import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router } from '@angular/router';
import { MapaPage } from './mapa.page';
import { AgendaService } from '../data/agenda.service';
import { RoutesService } from '../../routes/data/routes.service';
import { LoansService } from '../../loans/data/loans.service';
import { CustomersService } from '../../customers/data/customers.service';
import { LoanTemplatesService } from '../../loan-templates/data/loan-templates.service';
import { LoanExceptionsService } from '../../loan-exceptions/data/loan-exceptions.service';
import { PaymentsService } from '../../payments/data/payments.service';
import { AuthService } from '../../../core/auth/auth.service';
import { RouteFinancesService } from '../../route-finances/data/route-finances.service';

describe('MapaPage (Home Screen)', () => {
  const router = {
    navigate: vi.fn(),
  };

  const routeFinancesService = {
    getBalance: vi.fn().mockResolvedValue({
      routeId: 'route-1',
      routeName: 'Ruta Centro 1',
      initialBalance: 1000000,
      loanDisbursements: 200000,
      paymentCollections: 50000,
      incomeInvestments: 0,
      expenses: 10000,
      netBalance: 840000,
    }),
  };

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
        { provide: RouteFinancesService, useValue: routeFinancesService },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();
  });

  it('automatically selects first route and shows only pending (DueToday/Overdue) map points initially', async () => {
    const fixture = TestBed.createComponent(MapaPage);
    await fixture.whenStable();
    fixture.detectChanges();

    const page = fixture.componentInstance;
    expect(routesService.listAccessible).toHaveBeenCalled();
    expect(page.selectedRouteId()).toBe('route-1');
    expect(agendaService.getMapLocations).toHaveBeenCalledWith('route-1');
    expect(page.statusFilter()).toBe('PENDING');
    // cust-1 is DueToday (included), cust-2 is Collected (excluded initially)
    expect(page.mapPoints()).toHaveLength(1);
    expect(page.mapPoints()[0].customerId).toBe('cust-1');

    // Setting ALL shows all 2
    page.setFilter('ALL');
    fixture.detectChanges();
    expect(page.mapPoints()).toHaveLength(2);
  });

  it('filters map points when filter option is selected (Requirement 2.5.2)', async () => {
    const fixture = TestBed.createComponent(MapaPage);
    await fixture.whenStable();
    fixture.detectChanges();

    const page = fixture.componentInstance;
    page.setFilter('ALL');
    fixture.detectChanges();
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
    page.setFilter('COLLECTED');
    fixture.detectChanges();

    const pointWithoutLoan = page.mapPoints()[0];
    await page.onPointSelected(pointWithoutLoan);
    fixture.detectChanges();

    expect(page.canCollect()).toBe(false);
  });

  it('marks customer as WillNotPayToday, removes them from map, and allows restoring', async () => {
    const fixture = TestBed.createComponent(MapaPage);
    await fixture.whenStable();
    fixture.detectChanges();

    const page = fixture.componentInstance;
    // Initially shows cust-1 (DueToday)
    expect(page.mapPoints()).toHaveLength(1);
    expect(page.mapPoints()[0].customerId).toBe('cust-1');

    // Mark cust-1 as "Hoy no pagará"
    page.markWillNotPayToday('cust-1');
    fixture.detectChanges();

    expect(page.isCustomerMarkedWillNotPay('cust-1')).toBe(true);
    // Should NOT appear in the default PENDING view anymore
    expect(page.mapPoints()).toHaveLength(0);

    // Should appear when filtered by WILL_NOT_PAY
    page.setFilter('WILL_NOT_PAY');
    fixture.detectChanges();
    expect(page.mapPoints()).toHaveLength(1);
    expect(page.mapPoints()[0].customerId).toBe('cust-1');
    expect(page.mapPoints()[0].status).toBe('WillNotPayToday');

    // Unmark
    page.unmarkWillNotPayToday('cust-1');
    page.setFilter('PENDING');
    fixture.detectChanges();
    expect(page.mapPoints()).toHaveLength(1);
    expect(page.mapPoints()[0].customerId).toBe('cust-1');
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

  it('loads route balance when route is selected', async () => {
    const fixture = TestBed.createComponent(MapaPage);
    await fixture.whenStable();
    fixture.detectChanges();

    const page = fixture.componentInstance;
    expect(routeFinancesService.getBalance).toHaveBeenCalledWith('route-1');
    expect(page.routeBalance()?.netBalance).toBe(840000);

    const bubbleEl = fixture.nativeElement.querySelector('.floating-balance-bubble');
    expect(bubbleEl).toBeTruthy();
    expect(bubbleEl.textContent).toMatch(/840[,.]000/);
  });

  it('toggles balance visibility and masks amount with asterisks', async () => {
    const fixture = TestBed.createComponent(MapaPage);
    await fixture.whenStable();
    fixture.detectChanges();

    const page = fixture.componentInstance;
    page.isBalanceHidden.set(false);
    fixture.detectChanges();

    const eyeBtn = fixture.nativeElement.querySelector('.bubble-eye-toggle');
    expect(eyeBtn).toBeTruthy();

    // Toggle to hidden
    eyeBtn.click();
    fixture.detectChanges();

    expect(page.isBalanceHidden()).toBe(true);
    const masked = fixture.nativeElement.querySelector('.bubble-amount.masked');
    expect(masked).toBeTruthy();
    expect(masked.textContent).toContain('******');

    // Toggle back to visible
    eyeBtn.click();
    fixture.detectChanges();
    expect(page.isBalanceHidden()).toBe(false);
    expect(fixture.nativeElement.textContent).toMatch(/840[,.]000/);
  });

  it('opens popover when clicking balance bubble and navigates when clicking "Ir a resumen"', async () => {
    const fixture = TestBed.createComponent(MapaPage);
    await fixture.whenStable();
    fixture.detectChanges();

    const page = fixture.componentInstance;
    expect(page.summaryPopoverOpen()).toBe(false);

    const mainBtn = fixture.nativeElement.querySelector('.bubble-main-btn') as HTMLButtonElement;
    expect(mainBtn).toBeTruthy();

    // Click balance bubble object
    mainBtn.click();
    fixture.detectChanges();

    expect(page.summaryPopoverOpen()).toBe(true);
    expect(mainBtn.classList.contains('has-hover')).toBe(true);
    const popover = fixture.nativeElement.querySelector('.bubble-popover.visible');
    expect(popover).toBeTruthy();

    // Click "Ir a resumen" inside the popover
    const popoverBtn = fixture.nativeElement.querySelector('.popover-action-btn') as HTMLButtonElement;
    expect(popoverBtn).toBeTruthy();
    popoverBtn.click();
    fixture.detectChanges();

    expect(page.summaryPopoverOpen()).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/balance-ruta'], {
      queryParams: { routeId: 'route-1' },
    });
  });

  it('closes balance summary popover when clicking outside or losing focus', async () => {
    const fixture = TestBed.createComponent(MapaPage);
    await fixture.whenStable();
    fixture.detectChanges();

    const page = fixture.componentInstance;
    page.summaryPopoverOpen.set(true);
    fixture.detectChanges();
    expect(page.summaryPopoverOpen()).toBe(true);

    // Simulate clicking outside
    document.body.click();
    fixture.detectChanges();
    expect(page.summaryPopoverOpen()).toBe(false);

    // Reopen and test blur
    page.summaryPopoverOpen.set(true);
    fixture.detectChanges();

    const mainBtn = fixture.nativeElement.querySelector('.bubble-main-btn') as HTMLButtonElement;
    mainBtn.dispatchEvent(new FocusEvent('blur', { relatedTarget: document.body }));
    fixture.detectChanges();
    expect(page.summaryPopoverOpen()).toBe(false);
  });
});
