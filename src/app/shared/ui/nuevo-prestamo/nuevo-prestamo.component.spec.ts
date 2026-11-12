import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { NuevoPrestamoComponent } from './nuevo-prestamo.component';
import { CustomersService } from '../../../features/customers/data/customers.service';
import { RoutesService } from '../../../features/routes/data/routes.service';
import { AuthService } from '../../../core/auth/auth.service';
import { LoanTemplatesService } from '../../../features/loan-templates/data/loan-templates.service';
import { LoansService } from '../../../features/loans/data/loans.service';
import { LoanExceptionsService } from '../../../features/loan-exceptions/data/loan-exceptions.service';

describe('NuevoPrestamoComponent', () => {
  const customersService = {
    search: vi.fn().mockResolvedValue({ items: [], page: 1, pageSize: 100, totalCount: 0 }),
    get: vi.fn().mockResolvedValue({}),
    create: vi.fn().mockResolvedValue({ id: 'cust-1' }),
  };

  const routesService = {
    listAccessible: vi.fn().mockResolvedValue([]),
  };

  const authService = {
    context: signal({
      userId: 'user-1',
      organizationId: 'org-1',
      organizationCode: 'ORG',
      role: 'Collector' as const,
      displayName: 'Cobrador',
    }).asReadonly(),
  };

  const loanTemplatesService = {
    listAvailable: vi.fn().mockResolvedValue([]),
  };

  const loansService = {
    originate: vi.fn().mockResolvedValue({ id: 'loan-1' }),
    previewSchedule: vi.fn().mockResolvedValue({}),
  };

  const loanExceptionsService = {
    search: vi.fn().mockResolvedValue({ items: [], page: 1, pageSize: 100, totalCount: 0 }),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    await TestBed.configureTestingModule({
      imports: [NuevoPrestamoComponent],
      providers: [
        { provide: CustomersService, useValue: customersService },
        { provide: RoutesService, useValue: routesService },
        { provide: AuthService, useValue: authService },
        { provide: LoanTemplatesService, useValue: loanTemplatesService },
        { provide: LoansService, useValue: loansService },
        { provide: LoanExceptionsService, useValue: loanExceptionsService },
      ],
    }).compileComponents();
  });

  it('initially displays the collapsed docked button', () => {
    const fixture = TestBed.createComponent(NuevoPrestamoComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.state()).toBe('collapsed');
    const dockBtn = fixture.nativeElement.querySelector('.dock-card-btn');
    expect(dockBtn).toBeTruthy();
    expect(dockBtn.textContent).toContain('Nuevo préstamo');
  });

  it('clicking the docked button opens options with Nuevo cliente and Cliente existente', () => {
    const fixture = TestBed.createComponent(NuevoPrestamoComponent);
    fixture.detectChanges();

    const dockBtn = fixture.nativeElement.querySelector('.dock-card-btn') as HTMLButtonElement;
    dockBtn.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.state()).toBe('options');
    const newCustomerBtn = fixture.nativeElement.querySelector('.btn-option-new-customer');
    const existingCustomerBtn = fixture.nativeElement.querySelector('.btn-option-existing-customer');

    expect(newCustomerBtn).toBeTruthy();
    expect(existingCustomerBtn).toBeTruthy();
    expect(newCustomerBtn.textContent).toContain('Nuevo cliente');
    expect(existingCustomerBtn.textContent).toContain('Cliente existente');
  });

  it('clicking Nuevo cliente transitions to customer creation modal', () => {
    const fixture = TestBed.createComponent(NuevoPrestamoComponent);
    const comp = fixture.componentInstance;
    comp.openOptions();
    fixture.detectChanges();

    const newCustomerBtn = fixture.nativeElement.querySelector('.btn-option-new-customer') as HTMLButtonElement;
    newCustomerBtn.click();
    fixture.detectChanges();

    expect(comp.state()).toBe('new-customer');
  });

  it('clicking Cliente existente transitions to loan origination modal', () => {
    const fixture = TestBed.createComponent(NuevoPrestamoComponent);
    const comp = fixture.componentInstance;
    comp.openOptions();
    fixture.detectChanges();

    const existingCustomerBtn = fixture.nativeElement.querySelector('.btn-option-existing-customer') as HTMLButtonElement;
    existingCustomerBtn.click();
    fixture.detectChanges();

    expect(comp.state()).toBe('existing-customer');
  });

  it('collapses back when backdrop or close button is clicked in options', () => {
    const fixture = TestBed.createComponent(NuevoPrestamoComponent);
    const comp = fixture.componentInstance;
    comp.openOptions();
    fixture.detectChanges();

    const closeBtn = fixture.nativeElement.querySelector('.btn-close-options') as HTMLButtonElement;
    closeBtn.click();
    fixture.detectChanges();

    expect(comp.state()).toBe('collapsed');
  });
});

