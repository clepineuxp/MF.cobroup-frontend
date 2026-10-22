import { TestBed } from '@angular/core/testing';
import { CustomersService } from '../../customers/data/customers.service';
import { LoanTemplatesService } from '../../loan-templates/data/loan-templates.service';
import { LoanExceptionsService } from '../../loan-exceptions/data/loan-exceptions.service';
import { RoutesService } from '../../routes/data/routes.service';
import { LoansService } from '../data/loans.service';
import { LoansPage } from './loans.page';

describe('Operative LoansPage', () => {
  const loansService = {
    search: vi.fn().mockResolvedValue({
      items: [
        {
          id: 'loan-1',
          customerId: 'cust-1',
          customerName: 'Pedro Gómez',
          routeId: 'route-1',
          principalAmount: 500000,
          interestRate: 15,
          totalAmount: 575000,
          balanceAmount: 575000,
          paymentFrequency: 'Daily',
          installmentCount: 20,
          status: 'Active',
          startsAtUtc: '2026-11-01T00:00:00Z',
          dueAtUtc: '2026-11-21T00:00:00Z',
          createdAtUtc: new Date().toISOString(),
        },
      ],
      page: 1,
      pageSize: 25,
      totalCount: 1,
    }),
    get: vi.fn().mockResolvedValue({
      id: 'loan-1',
      customerId: 'cust-1',
      customerName: 'Pedro Gómez',
      routeId: 'route-1',
      routeName: 'Ruta 1',
      status: 'Active',
      principalAmount: 500000,
      interestRate: 15,
      interestAmount: 75000,
      totalAmount: 575000,
      paidAmount: 0,
      balanceAmount: 575000,
      paymentFrequency: 'Daily',
      installmentCount: 20,
      startsAtUtc: '2026-11-01T00:00:00Z',
      dueAtUtc: '2026-11-21T00:00:00Z',
      createdByUserId: 'user-1',
      createdByRole: 'Collector',
      createdAtUtc: new Date().toISOString(),
      installments: [
        {
          id: 'inst-1',
          number: 1,
          dueDate: '2026-11-02',
          expectedAmount: 28750,
          paidAmount: 0,
          status: 'Pending',
        },
      ],
    }),
    previewSchedule: vi.fn().mockResolvedValue({
      principalAmount: 500000,
      interestRate: 15,
      interestAmount: 75000,
      totalAmount: 575000,
      paymentFrequency: 'Daily',
      installmentCount: 20,
      startDate: '2026-11-01',
      dueDate: '2026-11-21',
      installments: [
        { number: 1, dueDate: '2026-11-02', expectedAmount: 28750 },
      ],
    }),
    originate: vi.fn().mockResolvedValue({
      id: 'loan-created',
      totalAmount: 575000,
    }),
  };

  const customersService = {
    search: vi.fn().mockResolvedValue({
      items: [
        {
          id: 'cust-1',
          firstNames: 'Pedro',
          lastNames: 'Gómez',
          businessOrWorkName: 'Panadería Gómez',
          status: 'Active',
          routeId: 'route-1',
        },
      ],
      page: 1,
      pageSize: 100,
      totalCount: 1,
    }),
  };

  const templatesService = {
    listAvailable: vi.fn().mockResolvedValue([
      {
        id: 'tpl-1',
        name: 'Microdiario 20D',
        version: 1,
        maxLoanDays: 20,
        maxPrincipalAmount: 1000000,
        allowedPercentages: [10, 15, 20],
      },
    ]),
  };

  const exceptionsService = {
    search: vi.fn().mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 100,
      totalCount: 0,
    }),
  };

  const routesService = {
    listAccessible: vi.fn().mockResolvedValue([
      {
        id: 'route-1',
        name: 'Ruta 1',
        description: 'Centro',
        assignedCollectorName: 'Cobrador 1',
        maxActiveCustomers: 50,
        maxActiveLoans: 20,
      },
    ]),
  };

  beforeEach(async () => {
    vi.restoreAllMocks();
    vi.clearAllMocks();

    await TestBed.configureTestingModule({
      imports: [LoansPage],
      providers: [
        { provide: LoansService, useValue: loansService },
        { provide: CustomersService, useValue: customersService },
        { provide: LoanTemplatesService, useValue: templatesService },
        { provide: LoanExceptionsService, useValue: exceptionsService },
        { provide: RoutesService, useValue: routesService },
      ],
    }).compileComponents();
  });

  it('renders loans list with customer name and status', async () => {
    const fixture = TestBed.createComponent(LoansPage);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Pedro Gómez');
    expect(fixture.nativeElement.textContent).toContain('Activo');
  });

  it('opens loan detail when loan card is clicked', async () => {
    const fixture = TestBed.createComponent(LoansPage);
    await fixture.whenStable();
    fixture.detectChanges();

    const page = fixture.componentInstance;
    await page.viewLoan('loan-1');
    fixture.detectChanges();

    expect(loansService.get).toHaveBeenCalledWith('loan-1');
    expect(page.selectedLoan()?.id).toBe('loan-1');
    expect(fixture.nativeElement.textContent).toContain('Cronograma de Pagos');
  });

  it('calculates schedule preview when values are filled', async () => {
    const fixture = TestBed.createComponent(LoansPage);
    await fixture.whenStable();
    fixture.detectChanges();

    const page = fixture.componentInstance;
    page.openOrigination();
    page.onTemplateChanged('tpl-1');

    await page.calculatePreview();
    fixture.detectChanges();

    expect(loansService.previewSchedule).toHaveBeenCalled();
    expect(page.schedulePreview()).not.toBeNull();
  });
});
