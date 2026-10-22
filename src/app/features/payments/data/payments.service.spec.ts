import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../../core/auth/auth.service';
import { API_CONFIG } from '../../../core/config/api.config';
import { PaymentsService } from './payments.service';

describe('Operative PaymentsService', () => {
  let service: PaymentsService;
  const authService = {
    authorizedFetch: vi.fn(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [
        PaymentsService,
        { provide: AuthService, useValue: authService },
        { provide: API_CONFIG, useValue: { baseUrl: '/api/operations/v1' } },
      ],
    });

    service = TestBed.inject(PaymentsService);
  });

  it('getPaymentMethods calls payment-methods endpoint', async () => {
    authService.authorizedFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: 'pm-1', name: 'Efectivo', displayOrder: 1 }],
    });

    const result = await service.getPaymentMethods();

    expect(authService.authorizedFetch).toHaveBeenCalledWith('/api/operations/v1/payments/payment-methods');
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('Efectivo');
  });

  it('registerPayment sends payment payload with idempotency key', async () => {
    authService.authorizedFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'pay-1',
        amount: 250,
        idempotencyKey: 'UUID-KEY-1',
        allocations: [],
      }),
    });

    const result = await service.registerPayment({
      loanId: 'loan-1',
      amount: 250,
      paymentMethodId: 'pm-1',
      notes: 'Pago parcial',
      idempotencyKey: 'UUID-KEY-1',
    });

    expect(authService.authorizedFetch).toHaveBeenCalledWith('/api/operations/v1/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        loanId: 'loan-1',
        amount: 250,
        paymentMethodId: 'pm-1',
        notes: 'Pago parcial',
        idempotencyKey: 'UUID-KEY-1',
      }),
    });
    expect(result.id).toBe('pay-1');
  });

  it('listByLoan gets all payments for specified loan', async () => {
    authService.authorizedFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: 'pay-1', amount: 100 }],
    });

    const result = await service.listByLoan('loan-1');

    expect(authService.authorizedFetch).toHaveBeenCalledWith('/api/operations/v1/payments/by-loan/loan-1');
    expect(result.length).toBe(1);
  });

  it('getDailyReconciliation calls daily reconciliation endpoint with date and route', async () => {
    authService.authorizedFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        routeId: 'route-1',
        date: '2026-10-21',
        totalCollected: 1500,
        paymentCount: 5,
        methodBreakdown: [],
      }),
    });

    const result = await service.getDailyReconciliation('route-1', '2026-10-21');

    expect(authService.authorizedFetch).toHaveBeenCalledWith(
      '/api/operations/v1/payments/daily-reconciliation?routeId=route-1&date=2026-10-21'
    );
    expect(result.totalCollected).toBe(1500);
  });

  it('attachEvidence posts evidence data', async () => {
    authService.authorizedFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'pay-1', evidences: [{ id: 'ev-1' }] }),
    });

    const result = await service.attachEvidence('pay-1', {
      fileName: 'recibo.jpg',
      contentType: 'image/jpeg',
      byteSize: 2048,
      storagePath: '/evidences/recibo.jpg',
    });

    expect(authService.authorizedFetch).toHaveBeenCalledWith('/api/operations/v1/payments/pay-1/evidence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: 'recibo.jpg',
        contentType: 'image/jpeg',
        byteSize: 2048,
        storagePath: '/evidences/recibo.jpg',
      }),
    });
    expect(result.id).toBe('pay-1');
  });
});
