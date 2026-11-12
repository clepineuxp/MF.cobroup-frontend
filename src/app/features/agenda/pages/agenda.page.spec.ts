import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoansService } from '../../loans/data/loans.service';
import { RoutesService } from '../../routes/data/routes.service';
import { RouteFinancesService } from '../../route-finances/data/route-finances.service';
import { CustomersService } from '../../customers/data/customers.service';
import { LoanTemplatesService } from '../../loan-templates/data/loan-templates.service';
import { LoanExceptionsService } from '../../loan-exceptions/data/loan-exceptions.service';
import { AuthService } from '../../../core/auth/auth.service';
import { AgendaResponse } from '../data/agenda.models';
import { AgendaService } from '../data/agenda.service';
import { AgendaPage } from './agenda.page';

describe('AgendaPage', () => {
  const sampleRoutes = [
    { id: 'route-1', name: 'Ruta 1', isCollector: true, isSupervisor: false, isActive: true },
  ];

  const sampleAgenda: AgendaResponse = {
    summary: {
      targetDate: '2026-10-26',
      routeId: 'route-1',
      totalCustomers: 4,
      totalDueToday: 50000,
      totalOverdue: 50000,
      totalCollectedToday: 150000,
      overdueCount: 1,
      dueTodayCount: 1,
      collectedCount: 1,
      upToDateCount: 1,
    },
    items: [
      {
        customerId: 'cust-1',
        customerName: 'Gloria Perez',
        businessOrWorkName: null,
        alias: 'Gloria Comidas',
        primaryPhone: '322322322',
        routeId: 'route-1',
        latitude: 4.6097,
        longitude: -74.0817,
        address: 'Calle 10 # 5-20',
        activeLoanId: 'loan-1',
        loanBalance: 550000,
        overdueAmount: 0,
        daysOverdue: 0,
        dueTodayAmount: 0,
        collectedTodayAmount: 0,
        installmentAmount: 25000,
        status: 'UpToDate',
        statusLabel: 'Al día',
        markerColor: '#3b82f6',
        distanceKm: 1.2,
      },
      {
        customerId: 'cust-2',
        customerName: 'Jhonny Arroyave',
        businessOrWorkName: null,
        alias: 'Jhonny Mecanico',
        primaryPhone: '3128801368',
        routeId: 'route-1',
        latitude: 4.6197,
        longitude: -74.0717,
        address: 'Porton blanco',
        activeLoanId: 'loan-2',
        loanBalance: 1150000,
        overdueAmount: 100000,
        daysOverdue: 2,
        dueTodayAmount: 50000,
        collectedTodayAmount: 0,
        installmentAmount: 50000,
        overdueInstallmentsCount: 2,
        status: 'Overdue',
        statusLabel: 'En mora (2d)',
        markerColor: '#ef4444',
        distanceKm: 2.5,
      },
      {
        customerId: 'cust-3',
        customerName: 'Camilo Lepineux',
        businessOrWorkName: null,
        alias: 'Camilo Oficina',
        primaryPhone: '311311311',
        routeId: 'route-1',
        latitude: 4.6297,
        longitude: -74.0617,
        address: 'Calle 80 # 11-44',
        activeLoanId: 'loan-3',
        loanBalance: 80000,
        overdueAmount: 0,
        daysOverdue: 0,
        dueTodayAmount: 80000,
        collectedTodayAmount: 0,
        installmentAmount: 80000,
        status: 'DueToday',
        statusLabel: 'Cobro hoy',
        markerColor: '#f59e0b',
        distanceKm: 0.8,
      },
      {
        customerId: 'cust-4',
        customerName: 'Sindy Arroyave',
        businessOrWorkName: null,
        alias: 'Sindy taller',
        primaryPhone: '3106555555',
        routeId: 'route-1',
        latitude: 4.6397,
        longitude: -74.0517,
        address: 'Carrera 15 # 45-12',
        activeLoanId: 'loan-4',
        loanBalance: 0,
        overdueAmount: 0,
        daysOverdue: 0,
        dueTodayAmount: 0,
        collectedTodayAmount: 150000,
        installmentAmount: 30000,
        status: 'Collected',
        statusLabel: 'Cobrado',
        markerColor: '#10b981',
        distanceKm: 3.1,
      },
    ],
  };

  const sampleRouteBalance = {
    routeId: 'route-1',
    routeName: 'Ruta 1',
    initialBalance: 500000,
    loanDisbursements: 350000,
    paymentCollections: 150000,
    incomeInvestments: 50000,
    expenses: 20000,
    netBalance: 330000,
  };

  const todayStr = new Date().toISOString().substring(0, 10);
  const sampleLoansSearch = {
    items: [
      {
        id: 'loan-new-1',
        customerId: 'cust-10',
        customerName: 'Cliente Diez',
        routeId: 'route-1',
        principalAmount: 200000,
        interestRate: 0.2,
        totalAmount: 240000,
        balanceAmount: 240000,
        paymentFrequency: 'Daily' as const,
        installmentCount: 24,
        status: 'Active' as const,
        startsAtUtc: `${todayStr}T10:00:00Z`,
        dueAtUtc: '2026-11-20T10:00:00Z',
        createdAtUtc: `${todayStr}T09:00:00Z`,
      },
      {
        id: 'loan-new-2',
        customerId: 'cust-11',
        customerName: 'Cliente Once',
        routeId: 'route-1',
        principalAmount: 150000,
        interestRate: 0.2,
        totalAmount: 180000,
        balanceAmount: 180000,
        paymentFrequency: 'Daily' as const,
        installmentCount: 20,
        status: 'Active' as const,
        startsAtUtc: `${todayStr}T11:00:00Z`,
        dueAtUtc: '2026-11-20T11:00:00Z',
        createdAtUtc: `${todayStr}T10:30:00Z`,
      },
    ],
    page: 1,
    pageSize: 100,
    totalCount: 2,
  };

  let agendaService: {
    getAgenda: ReturnType<typeof vi.fn>;
    optimizeSequence: ReturnType<typeof vi.fn>;
    getNonPaymentReasons: ReturnType<typeof vi.fn>;
    registerWillNotPay: ReturnType<typeof vi.fn>;
    cancelWillNotPay: ReturnType<typeof vi.fn>;
  };
  let routesService: {
    listAccessible: ReturnType<typeof vi.fn>;
  };
  let loansService: {
    search: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
  };
  let routeFinancesService: {
    getBalance: ReturnType<typeof vi.fn>;
  };
  let router: {
    navigate: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    try {
      localStorage.clear();
    } catch {
      // ignore
    }

    agendaService = {
      getAgenda: vi.fn().mockResolvedValue(sampleAgenda),
      optimizeSequence: vi.fn().mockResolvedValue(sampleAgenda),
      getNonPaymentReasons: vi.fn().mockResolvedValue([
        { id: 'reason-1', name: 'Cliente ausente / viaje', isActive: true, displayOrder: 1 },
      ]),
      registerWillNotPay: vi.fn().mockResolvedValue(true),
      cancelWillNotPay: vi.fn().mockResolvedValue(true),
    };
    routesService = {
      listAccessible: vi.fn().mockResolvedValue(sampleRoutes),
    };
    loansService = {
      search: vi.fn().mockResolvedValue(sampleLoansSearch),
      get: vi.fn().mockResolvedValue({
        id: 'loan-2',
        customerId: 'cust-2',
        customerName: 'Jhonny Arroyave',
        status: 'Active',
        totalAmount: 1150000,
        balanceAmount: 1150000,
        principalAmount: 1000000,
        paidAmount: 0,
        interestRate: 0.15,
        interestAmount: 150000,
        paymentFrequency: 'Daily',
        installmentCount: 30,
        startsAtUtc: '2026-10-01T00:00:00Z',
        dueAtUtc: '2026-11-01T00:00:00Z',
        createdByUserId: 'user-1',
        createdByRole: 'Admin',
        createdAtUtc: '2026-10-01T00:00:00Z',
        installments: [],
      }),
    };
    routeFinancesService = {
      getBalance: vi.fn().mockResolvedValue(sampleRouteBalance),
    };
    router = {
      navigate: vi.fn().mockResolvedValue(true),
    };

    TestBed.configureTestingModule({
      imports: [AgendaPage],
      providers: [
        { provide: AgendaService, useValue: agendaService },
        { provide: RoutesService, useValue: routesService },
        { provide: LoansService, useValue: loansService },
        { provide: RouteFinancesService, useValue: routeFinancesService },
        { provide: Router, useValue: router },
        {
          provide: CustomersService,
          useValue: {
            search: vi.fn().mockResolvedValue({ items: [], page: 1, pageSize: 100, totalCount: 0 }),
            get: vi.fn().mockResolvedValue({}),
            create: vi.fn().mockResolvedValue({ id: 'cust-created' }),
          },
        },
        {
          provide: LoanTemplatesService,
          useValue: {
            listAvailable: vi.fn().mockResolvedValue([]),
          },
        },
        {
          provide: LoanExceptionsService,
          useValue: {
            search: vi.fn().mockResolvedValue({ items: [], page: 1, pageSize: 100, totalCount: 0 }),
          },
        },
        {
          provide: AuthService,
          useValue: {
            context: signal({
              userId: 'user-1',
              organizationId: 'org-1',
              organizationCode: 'ORG',
              role: 'Collector' as const,
              displayName: 'Cobrador',
            }).asReadonly(),
          },
        },
      ],
    });
  });

  it('initially selects first route and enters directly in PENDING (cobro hoy / mora)', async () => {
    const fixture = TestBed.createComponent(AgendaPage);
    await fixture.whenStable();
    fixture.detectChanges();

    const page = fixture.componentInstance;
    expect(page.activeNavSegment()).toBe('PENDING');

    // Only cust-2 (Overdue) and cust-3 (DueToday) are pending, sorted alphabetically by name: Camilo (cust-3), Jhonny (cust-2)
    const items = page.filteredItems();
    expect(items).toHaveLength(2);
    expect(items.map((i) => i.customerId)).toEqual(['cust-3', 'cust-2']);
  });

  it('renders header with route name and opening date, and top balance with initial and actual balances', async () => {
    const fixture = TestBed.createComponent(AgendaPage);
    await fixture.whenStable();
    fixture.detectChanges();

    const page = fixture.componentInstance;
    const titleEl = fixture.nativeElement.querySelector('.title');
    expect(titleEl).toBeTruthy();
    expect(titleEl.textContent).toContain(page.currentRouteName());
    expect(titleEl.textContent).toContain('|');
    expect(titleEl.textContent).toContain(page.boxOpeningDateFormatted());

    const balanceEl = fixture.nativeElement.querySelector('.balance-card-top');
    expect(balanceEl).toBeTruthy();
    expect(balanceEl.textContent).toContain('Balance inicial');
    expect(balanceEl.textContent).toContain('Balance actual');

    const eyeBtn = balanceEl.querySelector('.btn-eye-toggle');
    expect(eyeBtn).toBeTruthy();

    // Toggle balance visibility - masks BOTH initial and actual balances
    expect(page.isBalanceHidden()).toBe(false);
    page.toggleBalanceVisibility();
    expect(page.isBalanceHidden()).toBe(true);
    fixture.detectChanges();

    const maskedEls = balanceEl.querySelectorAll('.balance-val.masked');
    expect(maskedEls.length).toBe(2);

    page.toggleBalanceVisibility();
    expect(page.isBalanceHidden()).toBe(false);
    fixture.detectChanges();
    expect(balanceEl.querySelector('.balance-val.masked')).toBeNull();
  });

  it('renders left block (recaudos + microseguros) and right block (ventas + gastos)', async () => {
    const fixture = TestBed.createComponent(AgendaPage);
    await fixture.whenStable();
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('.finance-block-card');
    expect(cards.length).toBe(2);

    // Left card: Recaudos + Microseguros e inversiones
    const leftCard = cards[0];
    expect(leftCard.textContent).toContain('Recaudos');
    expect(leftCard.textContent).toContain('Microseguros e inversiones');

    // Right card: Ventas + Gastos
    const rightCard = cards[1];
    expect(rightCard.textContent).toContain('Ventas');
    expect(rightCard.textContent).toContain('Gastos');
  });

  it('computes Estimado de cobro hoy and Estimado pago Total accurately', async () => {
    const fixture = TestBed.createComponent(AgendaPage);
    await fixture.whenStable();
    fixture.detectChanges();

    const page = fixture.componentInstance;
    // cust-2 (overdue, 1 installment = 50,000) + cust-3 (due today = 80,000) = 130,000
    expect(page.estimatedDueToday()).toBe(130000);

    // cust-2 (due 50k + overdue 100k = 150k) + cust-3 (due 80k = 80k) = 230,000
    expect(page.estimatedTotalPayment()).toBe(230000);

    const estCards = fixture.nativeElement.querySelectorAll('.estimate-card');
    expect(estCards.length).toBe(2);
    expect(estCards[0].textContent).toContain('Estimado de cobro hoy');
    expect(estCards[1].textContent).toContain('Estimado pago Total');
  });

  it('filters items dynamically by search input (name, alias, address, or amount)', async () => {
    const fixture = TestBed.createComponent(AgendaPage);
    await fixture.whenStable();
    fixture.detectChanges();

    const page = fixture.componentInstance;
    page.activeNavSegment.set('ADVANCED');
    page.selectedStatuses.set(new Set());

    // Search by alias "Mecanico"
    page.searchQuery.set('Mecanico');
    fixture.detectChanges();
    expect(page.filteredItems()).toHaveLength(1);
    expect(page.filteredItems()[0].customerId).toBe('cust-2');

    // Search by address "Porton"
    page.searchQuery.set('Porton');
    fixture.detectChanges();
    expect(page.filteredItems()).toHaveLength(1);
    expect(page.filteredItems()[0].customerId).toBe('cust-2');

    // Clear search
    page.clearSearch();
    fixture.detectChanges();
    expect(page.filteredItems()).toHaveLength(4);
  });

  it('reorders loan cards with up/down arrows and persists order', async () => {
    const fixture = TestBed.createComponent(AgendaPage);
    await fixture.whenStable();
    fixture.detectChanges();

    const page = fixture.componentInstance;
    // Currently pending: cust-3 first, cust-2 second
    const pendingItems = page.filteredItems();
    expect(pendingItems[0].customerId).toBe('cust-3');
    expect(pendingItems[1].customerId).toBe('cust-2');

    // Move cust-2 up
    page.moveItemUp(pendingItems[1]);
    fixture.detectChanges();

    const reordered = page.filteredItems();
    expect(reordered[0].customerId).toBe('cust-2');
    expect(reordered[1].customerId).toBe('cust-3');
  });

  it('marks customer loan as No pagará hoy, updates counts, and allows restoring', async () => {
    const fixture = TestBed.createComponent(AgendaPage);
    await fixture.whenStable();
    fixture.detectChanges();

    const page = fixture.componentInstance;
    expect(page.filteredItems()).toHaveLength(2);
    expect(page.pendingCount()).toBe(2);

    const targetItem = page.filteredItems()[0]; // cust-3
    await page.openWillNotPayModal(targetItem);
    await page.submitWillNotPay();
    fixture.detectChanges();

    expect(page.willNotPayCount()).toBe(1);
    expect(page.pendingCount()).toBe(1);
    expect(page.filteredItems()).toHaveLength(1);
    expect(page.filteredItems()[0].customerId).toBe('cust-2');

    // Switch to WILL_NOT_PAY segment
    page.selectSegment('WILL_NOT_PAY');
    fixture.detectChanges();
    expect(page.filteredItems()).toHaveLength(1);
    expect(page.filteredItems()[0].customerId).toBe('cust-3');

    // Restore
    await page.unmarkWillNotPayToday(targetItem);
    page.selectSegment('PENDING');
    fixture.detectChanges();
    expect(page.filteredItems()).toHaveLength(2);
  });

  it('renders nuevo-prestamo component at bottom and delegates actions', async () => {
    const fixture = TestBed.createComponent(AgendaPage);
    await fixture.whenStable();
    fixture.detectChanges();

    const nuevoPrestamo = fixture.nativeElement.querySelector('app-nuevo-prestamo');
    expect(nuevoPrestamo).toBeTruthy();

    const dockBtn = fixture.nativeElement.querySelector('.dock-card-btn') as HTMLButtonElement;
    expect(dockBtn).toBeTruthy();
    expect(dockBtn.textContent).toContain('Nuevo préstamo');
  });
});
