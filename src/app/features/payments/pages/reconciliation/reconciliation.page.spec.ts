import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RoutesService } from '../../../routes/data/routes.service';
import { PaymentsService } from '../../data/payments.service';
import { ReconciliationPage } from './reconciliation.page';

describe('ReconciliationPage', () => {
  let component: ReconciliationPage;
  let fixture: ComponentFixture<ReconciliationPage>;

  const paymentsServiceMock = {
    getDailyReconciliation: vi.fn(),
  };

  const routesServiceMock = {
    listAccessible: vi.fn(),
  };

  beforeEach(async () => {
    vi.restoreAllMocks();
    vi.clearAllMocks();

    routesServiceMock.listAccessible.mockResolvedValue([
      { id: 'route-1', name: 'Ruta Centro' },
    ]);

    paymentsServiceMock.getDailyReconciliation.mockResolvedValue({
      routeId: 'route-1',
      date: '2026-10-21',
      totalCollected: 1200,
      paymentCount: 4,
      methodBreakdown: [
        { paymentMethodId: 'pm-1', paymentMethodName: 'Efectivo', totalAmount: 1200, count: 4 },
      ],
    });

    await TestBed.configureTestingModule({
      imports: [ReconciliationPage],
      providers: [
        { provide: PaymentsService, useValue: paymentsServiceMock },
        { provide: RoutesService, useValue: routesServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ReconciliationPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('initializes and loads routes and initial report', async () => {
    await fixture.whenStable();
    expect(routesServiceMock.listAccessible).toHaveBeenCalled();
    expect(paymentsServiceMock.getDailyReconciliation).toHaveBeenCalledWith('route-1', expect.any(String));
    expect(component.routes().length).toBe(1);
    expect(component.report()?.totalCollected).toBe(1200);
  });

  it('calculates percentage correctly', () => {
    expect(component.calculatePercentage(300, 1200)).toBe(25);
    expect(component.calculatePercentage(0, 0)).toBe(0);
  });
});
