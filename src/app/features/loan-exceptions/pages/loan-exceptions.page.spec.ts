import { TestBed } from '@angular/core/testing';
import { CustomersService } from '../../customers/data/customers.service';
import { LoanExceptionsService } from '../data/loan-exceptions.service';
import { LoanExceptionsPage } from './loan-exceptions.page';

describe('Operative LoanExceptionsPage', () => {
  const exceptionsService = {
    search: vi.fn().mockResolvedValue({
      items: [
        {
          id: 'exc-1',
          customerId: 'cust-1',
          customerName: 'Laura Torres',
          routeId: 'route-1',
          proposedAmount: 30000,
          proposedDays: 15,
          proposedPercentage: 12,
          reason: 'Solicitud urgente',
          status: 'Pending',
          createdByUserId: 'user-1',
          createdByRole: 'Collector',
          createdAtUtc: new Date().toISOString(),
        },
      ],
      page: 1,
      pageSize: 25,
      totalCount: 1,
    }),
    create: vi.fn().mockResolvedValue({
      id: 'exc-2',
      status: 'Pending',
    }),
    cancel: vi.fn().mockResolvedValue({
      id: 'exc-1',
      status: 'Cancelled',
    }),
  };

  const customersService = {
    search: vi.fn().mockResolvedValue({
      items: [
        {
          id: 'cust-1',
          routeId: 'route-1',
          firstNames: 'Laura',
          lastNames: 'Torres',
          status: 'Active',
          primaryPhone: '3001234567',
          primaryLatitude: 4.6,
          primaryLongitude: -74.0,
          updatedAtUtc: new Date().toISOString(),
        },
      ],
      page: 1,
      pageSize: 100,
      totalCount: 1,
    }),
  };

  beforeEach(async () => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [LoanExceptionsPage],
      providers: [
        { provide: LoanExceptionsService, useValue: exceptionsService },
        { provide: CustomersService, useValue: customersService },
      ],
    }).compileComponents();
  });

  it('renders my exception requests with customer name and status', async () => {
    const fixture = TestBed.createComponent(LoanExceptionsPage);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Laura Torres');
    expect(fixture.nativeElement.textContent).toContain('Solicitud urgente');
    expect(fixture.nativeElement.textContent).toContain('Pendiente');
  });

  it('allows author to cancel pending request', async () => {
    const fixture = TestBed.createComponent(LoanExceptionsPage);
    await fixture.whenStable();
    fixture.detectChanges();

    const page = fixture.componentInstance;
    const item = page.items()[0];

    await page.cancelRequest(item);

    expect(exceptionsService.cancel).toHaveBeenCalledWith('exc-1');
  });
});
