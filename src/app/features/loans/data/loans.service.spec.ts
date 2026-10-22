import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../../core/auth/auth.service';
import { API_CONFIG } from '../../../core/config/api.config';
import { LoansService } from './loans.service';

describe('Operative LoansService', () => {
  let service: LoansService;
  const authService = {
    authorizedFetch: vi.fn(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [
        LoansService,
        { provide: AuthService, useValue: authService },
        { provide: API_CONFIG, useValue: { baseUrl: '/api/operations/v1' } },
      ],
    });

    service = TestBed.inject(LoansService);
  });

  it('search sends query parameters correctly', async () => {
    authService.authorizedFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [], page: 1, pageSize: 25, totalCount: 0 }),
    });

    const result = await service.search('route-1', 'cust-1', 'Active', 1, 10);

    expect(authService.authorizedFetch).toHaveBeenCalledWith(
      '/api/operations/v1/loans?page=1&pageSize=10&routeId=route-1&customerId=cust-1&status=Active'
    );
    expect(result.totalCount).toBe(0);
  });

  it('get fetches loan details by id', async () => {
    authService.authorizedFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'loan-1', principalAmount: 1000 }),
    });

    const result = await service.get('loan-1');

    expect(authService.authorizedFetch).toHaveBeenCalledWith('/api/operations/v1/loans/loan-1');
    expect(result.id).toBe('loan-1');
  });

  it('previewSchedule sends calculation parameters', async () => {
    authService.authorizedFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ totalAmount: 1100, installments: [] }),
    });

    const result = await service.previewSchedule({
      principalAmount: 1000,
      interestRate: 10,
      paymentFrequency: 'Daily',
      installmentCount: 5,
      startDate: '2026-11-01',
    });

    expect(authService.authorizedFetch).toHaveBeenCalledWith('/api/operations/v1/loans/preview-schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        principalAmount: 1000,
        interestRate: 10,
        paymentFrequency: 'Daily',
        installmentCount: 5,
        startDate: '2026-11-01',
      }),
    });
    expect(result.totalAmount).toBe(1100);
  });

  it('originate sends loan origination payload', async () => {
    authService.authorizedFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'loan-created', totalAmount: 1100 }),
    });

    const result = await service.originate({
      customerId: 'cust-1',
      principalAmount: 1000,
      interestRate: 10,
      paymentFrequency: 'Daily',
      installmentCount: 5,
      loanTemplateId: 'tpl-1',
      startDate: '2026-11-01',
    });

    expect(authService.authorizedFetch).toHaveBeenCalledWith('/api/operations/v1/loans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId: 'cust-1',
        principalAmount: 1000,
        interestRate: 10,
        paymentFrequency: 'Daily',
        installmentCount: 5,
        loanTemplateId: 'tpl-1',
        startDate: '2026-11-01',
      }),
    });
    expect(result.id).toBe('loan-created');
  });
});
