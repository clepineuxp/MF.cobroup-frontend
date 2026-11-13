import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { LoansService } from '../../loans/data/loans.service';
import { PaymentsService } from '../../payments/data/payments.service';
import { RoutesService } from '../../routes/data/routes.service';
import { RouteBalance, RouteFinancialEntry } from '../data/route-finance.models';
import { RouteFinancesService } from '../data/route-finances.service';
import { RouteFinancePage } from './route-finance.page';

describe('RouteFinancePage', () => {
  const sampleBalance: RouteBalance = {
    routeId: 'route-1',
    routeName: 'Ruta 1',
    initialBalance: 500000,
    loanDisbursements: 200000,
    paymentCollections: 300000,
    incomeInvestments: 100000,
    expenses: 50000,
    netBalance: 650000,
  };

  const sampleIncomes: RouteFinancialEntry[] = [
    {
      id: 'inc-1',
      routeId: 'route-1',
      type: 'Income',
      concept: 'Aporte socios inicial',
      description: 'Capital base de trabajo',
      amount: 100000,
      createdByUserId: 'u1',
      createdByDisplayName: 'Admin User',
      createdAtUtc: new Date().toISOString(),
      updatedByUserId: 'u1',
      updatedByDisplayName: 'Admin User',
      updatedAtUtc: new Date().toISOString(),
      canEdit: true,
    },
  ];

  const sampleExpenses: RouteFinancialEntry[] = [
    {
      id: 'exp-1',
      routeId: 'route-1',
      type: 'Expense',
      concept: 'Gasolina motocicleta',
      description: 'Recorrido sector norte',
      amount: 35000,
      createdByUserId: 'u2',
      createdByDisplayName: 'Cobrador 1',
      createdAtUtc: new Date().toISOString(),
      updatedByUserId: 'u2',
      updatedByDisplayName: 'Cobrador 1',
      updatedAtUtc: new Date().toISOString(),
      canEdit: true,
    },
  ];

  const sampleLoans = [
    {
      id: 'loan-1',
      customerId: 'cust-1',
      customerName: 'Juan Pérez',
      routeId: 'route-1',
      principalAmount: 500000,
      interestRate: 20,
      totalAmount: 600000,
      balanceAmount: 300000,
      paymentFrequency: 'Daily',
      installmentCount: 30,
      status: 'Active',
      startsAtUtc: new Date().toISOString(),
      dueAtUtc: new Date().toISOString(),
      createdAtUtc: new Date().toISOString(),
    },
  ];

  const samplePayments = [
    {
      id: 'pay-1',
      loanId: 'loan-1',
      customerId: 'cust-1',
      routeId: 'route-1',
      amount: 20000,
      paymentMethodId: 'pm-1',
      paymentMethodName: 'Efectivo',
      notes: 'Cuota 1',
      idempotencyKey: 'key-1',
      registeredAtUtc: new Date().toISOString(),
      remainingLoanBalance: 280000,
      loanStatus: 'Active',
      allocations: [],
      evidences: [],
    },
  ];

  const routesMock = {
    listAccessible: vi.fn().mockResolvedValue([
      {
        id: 'route-1',
        name: 'Ruta 1',
        description: 'Ruta centro',
        accessAs: 'Collector',
        maxActiveCustomers: 100,
        maxActiveLoans: 50,
      },
      {
        id: 'route-2',
        name: 'Ruta 2',
        description: 'Ruta norte',
        accessAs: 'Collector',
        maxActiveCustomers: 100,
        maxActiveLoans: 50,
      },
    ]),
  };

  const financesMock = {
    getBalance: vi.fn().mockResolvedValue(sampleBalance),
    listEntries: vi.fn().mockImplementation((_routeId: string, section: string) => {
      if (section === 'income-investments') return Promise.resolve(sampleIncomes);
      if (section === 'expenses') return Promise.resolve(sampleExpenses);
      return Promise.resolve([]);
    }),
    create: vi.fn().mockResolvedValue(sampleIncomes[0]),
    update: vi.fn().mockResolvedValue(sampleIncomes[0]),
    getEligibleLoansForMicroinsurance: vi.fn().mockResolvedValue([]),
  };

  const loansServiceMock = {
    search: vi.fn().mockResolvedValue({
      items: sampleLoans,
      page: 1,
      pageSize: 50,
      totalCount: 1,
    }),
  };

  const paymentsServiceMock = {
    listByLoan: vi.fn().mockResolvedValue(samplePayments),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [RouteFinancePage],
      providers: [
        { provide: RoutesService, useValue: routesMock },
        { provide: RouteFinancesService, useValue: financesMock },
        { provide: LoansService, useValue: loansServiceMock },
        { provide: PaymentsService, useValue: paymentsServiceMock },
      ],
    }).compileComponents();
  });

  it('initializes in General view showing Income tab first with consolidated balance and payments', async () => {
    const fixture = TestBed.createComponent(RouteFinancePage);
    const component = fixture.componentInstance;
    await fixture.whenStable();
    fixture.detectChanges();

    // Default route is empty string -> Todas las rutas (General)
    expect(component.selectedRouteId()).toBe('');
    expect(component.isGeneralView()).toBe(true);
    expect(component.activeTab()).toBe('income');

    // Net balance rendered
    expect(fixture.nativeElement.textContent).toContain('Caja de Ruta');
    expect(fixture.nativeElement.textContent).toContain('Todas las rutas (General)');
    // Both manual incomes and cobros are in Income tab
    expect(fixture.nativeElement.textContent).toContain('Aporte socios inicial');
    expect(fixture.nativeElement.textContent).toContain('Cobro a Juan Pérez');
  });

  it('switches to expenses tab and shows loan disbursements and manual expenses', async () => {
    const fixture = TestBed.createComponent(RouteFinancePage);
    const component = fixture.componentInstance;
    await fixture.whenStable();
    fixture.detectChanges();

    // Switch to expenses
    component.setTab('expense');
    fixture.detectChanges();

    expect(component.activeTab()).toBe('expense');
    expect(fixture.nativeElement.textContent).toContain('Gasolina motocicleta');
    expect(fixture.nativeElement.textContent).toContain('Préstamo a Juan Pérez');
  });

  it('navigates days with day buttons strip, yearly and range selectors', async () => {
    const fixture = TestBed.createComponent(RouteFinancePage);
    const component = fixture.componentInstance;
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.periodType()).toBe('daily');
    expect(component.dayButtons().length).toBe(7);

    // Change period to weekly
    component.setPeriod('weekly');
    expect(component.periodType()).toBe('weekly');

    // Change period to monthly
    component.setPeriod('monthly');
    expect(component.periodType()).toBe('monthly');

    // Change period to yearly
    component.setPeriod('yearly');
    expect(component.periodType()).toBe('yearly');
    expect(component.viewingText()).toContain(`Año ${new Date().getFullYear()}`);

    // Change period to range
    component.setPeriod('range');
    component.setRangeStartDate('2026-01-01');
    component.setRangeEndDate('2026-12-31');
    expect(component.periodType()).toBe('range');
    expect(component.viewingText()).toBe('Del 2026-01-01 al 2026-12-31');
  });

  it('opens modal for nuevo ingreso, selects target route and creates entry', async () => {
    const fixture = TestBed.createComponent(RouteFinancePage);
    const component = fixture.componentInstance;
    await fixture.whenStable();
    fixture.detectChanges();

    component.openCreateModal('income');
    fixture.detectChanges();

    expect(component.isModalOpen()).toBe(true);
    expect(component.modalSection()).toBe('income');

    component.modalForm.setValue({
      targetRouteId: 'route-1',
      type: 'Income',
      concept: 'Nuevo capital de trabajo',
      description: 'Aporte adicional',
      amount: 75000,
      loanId: null,
    });

    await component.submitModal();
    fixture.detectChanges();

    expect(financesMock.create).toHaveBeenCalledWith({
      routeId: 'route-1',
      type: 'Income',
      concept: 'Nuevo capital de trabajo',
      description: 'Aporte adicional',
      amount: 75000,
      loanId: null,
    });
    expect(component.isModalOpen()).toBe(false);
  });

  it('hides route selector dropdown when only 1 route is available and automatically selects it', async () => {
    routesMock.listAccessible.mockResolvedValueOnce([
      {
        id: 'route-only-1',
        name: 'Ruta Unica',
        description: 'Ruta centro',
        accessAs: 'Collector',
        maxActiveCustomers: 100,
        maxActiveLoans: 50,
      },
    ]);

    const fixture = TestBed.createComponent(RouteFinancePage);
    const component = fixture.componentInstance;
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.routes().length).toBe(1);
    expect(component.selectedRouteId()).toBe('route-only-1');

    const selector = fixture.nativeElement.querySelector('#route-selector');
    expect(selector).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Ruta Unica');
  });

  it('opens directly in expense tab when query param tab or section is expense', async () => {
    const routeSnapshotMock = {
      snapshot: {
        queryParamMap: new Map([
          ['routeId', 'route-1'],
          ['tab', 'expense'],
        ]),
      },
      queryParamMap: {
        subscribe: vi.fn(),
      },
    };

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [RouteFinancePage],
      providers: [
        { provide: RoutesService, useValue: routesMock },
        { provide: RouteFinancesService, useValue: financesMock },
        { provide: LoansService, useValue: loansServiceMock },
        { provide: PaymentsService, useValue: paymentsServiceMock },
        { provide: ActivatedRoute, useValue: routeSnapshotMock },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(RouteFinancePage);
    const component = fixture.componentInstance;
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.activeTab()).toBe('expense');
  });
});
