import { TestBed } from '@angular/core/testing';
import { RoutesService } from '../data/routes.service';
import { RoutesPage } from './routes.page';

describe('RoutesPage', () => {
  const service = {
    listAccessible: vi.fn().mockResolvedValue([{
      id: 'route-1', name: 'Centro', description: null, accessAs: 'Collector',
      maxActiveCustomers: 100, maxActiveLoans: null,
    }]),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [RoutesPage],
      providers: [{ provide: RoutesService, useValue: service }],
    }).compileComponents();
  });

  it('renders only routes returned by the authorized contract', async () => {
    const fixture = TestBed.createComponent(RoutesPage);
    await fixture.whenStable(); fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Centro');
    expect(fixture.nativeElement.textContent).toContain('Cobrador');
    expect(fixture.nativeElement.textContent).toContain('Sin límite');
  });
});
