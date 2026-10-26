import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../../core/auth/auth.service';
import { API_CONFIG } from '../../../core/config/api.config';
import { RouteFinancesService } from './route-finances.service';

describe('RouteFinancesService', () => {
  const auth = { authorizedFetch: vi.fn() };
  let service: RouteFinancesService;

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({ providers: [
      RouteFinancesService,
      { provide: AuthService, useValue: auth },
      { provide: API_CONFIG, useValue: { baseUrl: '/api/operations/v1' } },
    ] });
    service = TestBed.inject(RouteFinancesService);
  });

  it('loads the balance for the selected route', async () => {
    auth.authorizedFetch.mockResolvedValue(new Response(JSON.stringify({ routeId: 'route-1', netBalance: -50 }), { status: 200 }));
    const result = await service.getBalance('route-1');
    expect(auth.authorizedFetch).toHaveBeenCalledWith('/api/operations/v1/route-finances/route-1/balance');
    expect(result.netBalance).toBe(-50);
  });

  it('posts server-dated financial entries', async () => {
    auth.authorizedFetch.mockResolvedValue(new Response(JSON.stringify({ id: 'entry-1' }), { status: 201 }));
    await service.create({ routeId: 'route-1', type: 'Income', concept: 'Aporte', description: null, amount: 100 });
    expect(auth.authorizedFetch).toHaveBeenCalledWith('/api/operations/v1/route-finances/entries', expect.objectContaining({ method: 'POST' }));
  });
});
