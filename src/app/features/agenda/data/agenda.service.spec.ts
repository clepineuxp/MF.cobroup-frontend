import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../../core/auth/auth.service';
import { API_CONFIG } from '../../../core/config/api.config';
import { AgendaService } from './agenda.service';

describe('AgendaService in Collector Frontend', () => {
  let service: AgendaService;
  const authService = {
    authorizedFetch: vi.fn(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [
        AgendaService,
        { provide: AuthService, useValue: authService },
        { provide: API_CONFIG, useValue: { baseUrl: '/api/operations/v1' } },
      ],
    });

    service = TestBed.inject(AgendaService);
  });

  it('getAgenda calls agenda endpoint with routeId and targetDate query params', async () => {
    authService.authorizedFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        summary: {
          targetDate: '2026-10-21',
          routeId: 'r-1',
          totalCustomers: 5,
          totalDueToday: 500,
          totalOverdue: 200,
          totalCollectedToday: 100,
          overdueCount: 1,
          dueTodayCount: 2,
          collectedCount: 1,
          upToDateCount: 1,
        },
        items: [],
      }),
    });

    const result = await service.getAgenda('r-1', '2026-10-21');

    expect(authService.authorizedFetch).toHaveBeenCalledWith(
      '/api/operations/v1/agenda?routeId=r-1&targetDate=2026-10-21',
    );
    expect(result.summary.totalCustomers).toBe(5);
    expect(result.summary.totalOverdue).toBe(200);
  });

  it('getMapLocations calls map-locations endpoint', async () => {
    authService.authorizedFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          customerId: 'c-1',
          customerName: 'Cliente 1',
          latitude: 4.60,
          longitude: -74.08,
          status: 'Overdue',
          markerColor: '#DC2626',
        },
      ],
    });

    const result = await service.getMapLocations('r-1');

    expect(authService.authorizedFetch).toHaveBeenCalledWith('/api/operations/v1/agenda/map-locations?routeId=r-1');
    expect(result.length).toBe(1);
    expect(result[0].customerName).toBe('Cliente 1');
  });

  it('optimizeSequence sends origin coordinates to optimize-sequence endpoint', async () => {
    authService.authorizedFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        summary: { totalCustomers: 2 },
        items: [],
      }),
    });

    const result = await service.optimizeSequence(4.61, -74.09, 'r-1', '2026-10-21');

    expect(authService.authorizedFetch).toHaveBeenCalledWith(
      '/api/operations/v1/agenda/optimize-sequence',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          routeId: 'r-1',
          targetDate: '2026-10-21',
          originLatitude: 4.61,
          originLongitude: -74.09,
        }),
      }),
    );
    expect(result.summary.totalCustomers).toBe(2);
  });
});
