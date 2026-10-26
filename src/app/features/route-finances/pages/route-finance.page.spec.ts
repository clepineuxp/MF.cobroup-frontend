import { TestBed } from '@angular/core/testing';
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
    expect(fixture.nativeElement.textContent).toContain('Balance Ruta');
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

  it('navigates days with day buttons strip and period selector', async () => {
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
    });

    await component.submitModal();
    fixture.detectChanges();

    expect(financesMock.create).toHaveBeenCalledWith({
      routeId: 'route-1',
      type: 'Income',
      concept: 'Nuevo capital de trabajo',
      description: 'Aporte adicional',
      amount: 75000,
    });
    expect(component.isModalOpen()).toBe(false);
  });
});
