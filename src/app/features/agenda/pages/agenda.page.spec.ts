import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoansService } from '../../loans/data/loans.service';
import { RoutesService } from '../../routes/data/routes.service';
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
        overdueAmount: 50000,
        daysOverdue: 1,
        dueTodayAmount: 50000,
        collectedTodayAmount: 0,
        status: 'Overdue',
        statusLabel: 'En mora (1d)',
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
        status: 'Collected',
        statusLabel: 'Cobrado',
        markerColor: '#10b981',
        distanceKm: 3.1,
      },
    ],
  };

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
        startsAtUtc: '2026-10-26T10:00:00Z',
        dueAtUtc: '2026-11-20T10:00:00Z',
        createdAtUtc: '2026-10-26T09:00:00Z',
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
        startsAtUtc: '2026-10-26T11:00:00Z',
        dueAtUtc: '2026-11-20T11:00:00Z',
        createdAtUtc: '2026-10-26T10:30:00Z',
      },
    ],
    page: 1,
    pageSize: 100,
    totalCount: 2,
  };

  let agendaService: {
    getAgenda: ReturnType<typeof vi.fn>;
    optimizeSequence: ReturnType<typeof vi.fn>;
  };
  let routesService: {
    listAccessible: ReturnType<typeof vi.fn>;
  };
  let loansService: {
    search: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
  };
  let router: {
    navigate: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    localStorage.clear();

    agendaService = {
      getAgenda: vi.fn().mockResolvedValue(sampleAgenda),
      optimizeSequence: vi.fn().mockResolvedValue(sampleAgenda),
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
    router = {
      navigate: vi.fn().mockResolvedValue(true),
    };

    TestBed.configureTestingModule({
      imports: [AgendaPage],
      providers: [
        { provide: AgendaService, useValue: agendaService },
        { provide: RoutesService, useValue: routesService },
        { provide: LoansService, useValue: loansService },
        { provide: Router, useValue: router },
      ],
    });
  });

  it('initially selects first route and shows only pending (DueToday/Overdue) items', async () => {
    const fixture = TestBed.createComponent(AgendaPage);
    await fixture.whenStable();
    fixture.detectChanges();

    const page = fixture.componentInstance;
    expect(page.activeFilter()).toBe('PENDING');

    // Only cust-2 (Overdue) and cust-3 (DueToday) are pending
    const items = page.filteredItems();
    expect(items).toHaveLength(2);
    expect(items.map((i) => i.customerId)).toEqual(['cust-2', 'cust-3']);
  });

  it('renders Total prestado hoy and Total cobrado hoy cards in "$amount | count" format', async () => {
    const fixture = TestBed.createComponent(AgendaPage);
    await fixture.whenStable();
    fixture.detectChanges();

    const page = fixture.componentInstance;
    // 2 loans totaling 350,000 COP
    expect(page.totalLoanedToday()).toBe(350000);
    expect(page.loanedCountToday()).toBe(2);

    const cards = fixture.nativeElement.querySelectorAll('.metric-card');
    expect(cards.length).toBe(5);

    // Metric 3: Total prestado hoy
    const loanedCard = cards[2];
    expect(loanedCard.textContent).toContain('Total prestado hoy');
    expect(loanedCard.textContent).toMatch(/350[,.]000\s*\|\s*2/);

    // Metric 4: Total cobrado hoy
    const collectedCard = cards[3];
    expect(collectedCard.textContent).toContain('Total cobrado hoy');
    expect(collectedCard.textContent).toMatch(/150[,.]000\s*\|\s*1/);
  });

  it('renders single-line title with ellipsis and dedicated status line', async () => {
    const fixture = TestBed.createComponent(AgendaPage);
    await fixture.whenStable();
    fixture.detectChanges();

    const firstCard = fixture.nativeElement.querySelector('.stop-card');
    expect(firstCard).toBeTruthy();

    const aliasEl = firstCard.querySelector('.client-alias');
    expect(aliasEl).toBeTruthy();
    expect(aliasEl.textContent.trim()).toBe('Jhonny Mecanico');

    const nameEl = firstCard.querySelector('.name-row');
    expect(nameEl).toBeTruthy();
    expect(nameEl.textContent.trim()).toBe('· Jhonny Arroyave');

    const statusRow = firstCard.querySelector('.status-row');
    expect(statusRow).toBeTruthy();
    const pill = statusRow.querySelector('.status-pill');
    expect(pill.textContent.trim()).toBe('En mora (1d)');
  });

  it('does NOT show Cobrar or No pagara hoy for UpToDate or Collected items', async () => {
    const fixture = TestBed.createComponent(AgendaPage);
    await fixture.whenStable();
    fixture.detectChanges();

    const page = fixture.componentInstance;
    // Switch filter to ALL to see Gloria (UpToDate) and Sindy (Collected)
    page.setFilter('ALL');
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('.stop-card');
    expect(cards).toHaveLength(4);

    // Card 0 is Gloria (UpToDate)
    const cardGloria = cards[0];
    const gloriaActionCol = cardGloria.querySelector('.action-col');
    expect(gloriaActionCol.querySelector('.btn-collect')).toBeNull();
    expect(gloriaActionCol.querySelector('.btn-will-not-pay')).toBeNull();

    // Card 3 is Sindy (Collected)
    const cardSindy = cards[3];
    const sindyActionCol = cardSindy.querySelector('.action-col');
    expect(sindyActionCol.querySelector('.btn-collect')).toBeNull();
    expect(sindyActionCol.querySelector('.btn-will-not-pay')).toBeNull();
  });

  it('shows both Cobrar (gray) and No pagará hoy (red) for pending items', async () => {
    const fixture = TestBed.createComponent(AgendaPage);
    await fixture.whenStable();
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('.stop-card');
    expect(cards).toHaveLength(2);

    const firstActionCol = cards[0].querySelector('.action-col');
    const collectBtn = firstActionCol.querySelector('.btn-collect');
    const willNotPayBtn = firstActionCol.querySelector('.btn-will-not-pay');

    expect(collectBtn).toBeTruthy();
    expect(collectBtn.textContent.trim()).toBe('Cobrar');
    expect(willNotPayBtn).toBeTruthy();
    expect(willNotPayBtn.textContent.trim()).toBe('No pagará hoy');
  });

  it('marks customer as No pagará hoy, removes them from pending, and allows restoring', async () => {
    const fixture = TestBed.createComponent(AgendaPage);
    await fixture.whenStable();
    fixture.detectChanges();

    const page = fixture.componentInstance;
    expect(page.filteredItems()).toHaveLength(2);
    expect(page.pendingCount()).toBe(2);

    // Mark Jhonny (cust-2) as "No pagará hoy"
    page.markWillNotPayToday('cust-2');
    fixture.detectChanges();

    expect(page.willNotPayCount()).toBe(1);
    expect(page.pendingCount()).toBe(1);
    // Only Camilo (cust-3) remains in pending
    expect(page.filteredItems()).toHaveLength(1);
    expect(page.filteredItems()[0].customerId).toBe('cust-3');

    // Switch to WILL_NOT_PAY tab
    page.setFilter('WILL_NOT_PAY');
    fixture.detectChanges();

    expect(page.filteredItems()).toHaveLength(1);
    expect(page.filteredItems()[0].customerId).toBe('cust-2');
    expect(page.effectiveStatusLabel(page.filteredItems()[0])).toBe('Hoy no pagará');

    // Restore customer
    page.unmarkWillNotPayToday('cust-2');
    page.setFilter('PENDING');
    fixture.detectChanges();

    expect(page.filteredItems()).toHaveLength(2);
    expect(page.pendingCount()).toBe(2);
  });
});
