import { TestBed } from '@angular/core/testing';
import { LoanOriginationModalComponent } from './loan-origination-modal.component';
import { LoansService } from '../../../features/loans/data/loans.service';
import { CustomersService } from '../../../features/customers/data/customers.service';
import { LoanTemplatesService } from '../../../features/loan-templates/data/loan-templates.service';
import { LoanExceptionsService } from '../../../features/loan-exceptions/data/loan-exceptions.service';

describe('LoanOriginationModalComponent', () => {
  const loansService = {
    originate: vi.fn().mockResolvedValue({
      id: 'loan-created',
      customerId: 'cust-1',
      totalAmount: 550000,
    }),
    previewSchedule: vi.fn().mockResolvedValue({
      totalAmount: 550000,
      interestAmount: 50000,
      dueDate: '2026-11-20',
      installments: [{ number: 1, dueDate: '2026-11-01', expectedAmount: 27500 }],
    }),
  };

  const customersService = {
    search: vi.fn().mockResolvedValue({
      items: [{ id: 'cust-1', routeId: 'route-1', firstNames: 'Ana', lastNames: 'Pérez', status: 'Active' }],
      page: 1,
      pageSize: 100,
      totalCount: 1,
    }),
  };

  const templatesService = {
    listAvailable: vi.fn().mockResolvedValue([
      {
        id: 'tpl-1',
        name: 'Microcrédito 20',
        version: 1,
        maxLoanDays: 20,
        maxPrincipalAmount: 1000000,
        allowedPercentages: [10], minPrincipalAmount: 100000, minPercentage: 10, maxPercentage: 20, routeIds: ['route-1'],
      },
    ]),
  };

  const exceptionsService = {
    search: vi.fn().mockResolvedValue({ items: [], page: 1, pageSize: 100, totalCount: 0 }),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    await TestBed.configureTestingModule({
      imports: [LoanOriginationModalComponent],
      providers: [
        { provide: LoansService, useValue: loansService },
        { provide: CustomersService, useValue: customersService },
        { provide: LoanTemplatesService, useValue: templatesService },
        { provide: LoanExceptionsService, useValue: exceptionsService },
      ],
    }).compileComponents();
  });

  it('loads customers and templates on modal init', async () => {
    const fixture = TestBed.createComponent(LoanOriginationModalComponent);
    const comp = fixture.componentInstance;
    comp.isOpen = true;
    await comp.initModal();
    fixture.detectChanges();

    expect(customersService.search).toHaveBeenCalled();
    expect(templatesService.listAvailable).toHaveBeenCalled();
    expect(comp.customers()).toHaveLength(1);
    expect(comp.templates()).toHaveLength(1);
  });

  it('leaves required terms empty and editable when selecting a template', async () => {
    const fixture = TestBed.createComponent(LoanOriginationModalComponent);
    const comp = fixture.componentInstance;
    comp.isOpen = true;
    await comp.initModal();
    fixture.detectChanges();
    const selector = fixture.nativeElement.querySelector('select[formControlName="loanTemplateId"]') as HTMLSelectElement;
    comp.form.controls.customerId.setValue('cust-1'); fixture.detectChanges();
    selector.value = 'tpl-1'; selector.dispatchEvent(new Event('change')); fixture.detectChanges();
    expect(comp.form.controls.loanTemplateId.value).toBe('tpl-1');
    for (const name of ['principalAmount', 'interestRate', 'installmentCount'] as const) {
      expect(comp.form.controls[name].value).toBeNull();
      expect(comp.form.controls[name].hasError('required')).toBe(true);
      const field = fixture.nativeElement.querySelector(`[formControlName="${name}"]`) as HTMLInputElement;
      expect(field.disabled).toBe(false); expect(field.readOnly).toBe(false); expect(field.value).toBe('');
    }
    expect(loansService.previewSchedule).not.toHaveBeenCalled();
    await comp.submitOrigination(); expect(loansService.originate).not.toHaveBeenCalled();
  });

  it('preserves manually entered terms when switching templates and previews them on input', async () => {
    const comp = TestBed.createComponent(LoanOriginationModalComponent).componentInstance;
    await comp.initModal();
    comp.form.patchValue({ customerId: 'cust-1', loanTemplateId: 'tpl-1', principalAmount: 500000, interestRate: 12.5, installmentCount: 15 });
    await comp.calculatePreview(); expect(comp.schedulePreview()).toBeTruthy();
    loansService.previewSchedule.mockClear();
    comp.onTemplateChanged('tpl-1');
    expect(comp.form.getRawValue()).toMatchObject({ principalAmount: 500000, interestRate: 12.5, installmentCount: 15 });
    expect(comp.schedulePreview()).toBeNull(); expect(loansService.previewSchedule).not.toHaveBeenCalled();
    await comp.calculatePreview();
    expect(loansService.previewSchedule).toHaveBeenCalledWith(expect.objectContaining({ principalAmount: 500000, interestRate: 12.5, installmentCount: 15 }));
  });

  it('filters templates by customer route and resets selection when changing customers', async () => {
    const comp = TestBed.createComponent(LoanOriginationModalComponent).componentInstance;
    await comp.initModal();
    comp.customers.set([
      ...comp.customers(),
      { ...comp.customers()[0], id: 'cust-2', routeId: 'route-2' },
    ]);
    expect(comp.availableTemplates).toHaveLength(0);
    comp.form.patchValue({ customerId: 'cust-1', loanTemplateId: 'tpl-1' });
    expect(comp.availableTemplates.map(item => item.id)).toEqual(['tpl-1']);
    comp.form.patchValue({ customerId: 'cust-2' });
    comp.onCustomerChanged('cust-2');
    expect(comp.form.controls.loanTemplateId.value).toBe('');
    expect(comp.availableTemplates).toHaveLength(0);
  });

  it('blocks values outside template bounds and accepts an intermediate rate', async () => {
    const comp = TestBed.createComponent(LoanOriginationModalComponent).componentInstance;
    await comp.initModal();
    comp.form.patchValue({ customerId: 'cust-1', loanTemplateId: 'tpl-1', principalAmount: 99999, interestRate: 12.5 });
    expect(comp.templateLimitsError).toContain('monto');
    comp.form.patchValue({ principalAmount: 500000, interestRate: 21 });
    expect(comp.templateLimitsError).toContain('interés');
    comp.form.patchValue({ interestRate: 12.5 });
    expect(comp.templateLimitsError).toBe('');
  });

  it('offers monthly payments and sends the monthly frequency without a day interval', async () => {
    const fixture = TestBed.createComponent(LoanOriginationModalComponent);
    const comp = fixture.componentInstance;
    comp.isOpen = true;
    await comp.initModal();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('option[value="Monthly"]').textContent).toContain('Mensual');
    comp.form.patchValue({ customerId: 'cust-1', loanTemplateId: 'tpl-1', principalAmount: 500000,
      interestRate: 12.5, installmentCount: 2, paymentFrequency: 'Monthly', frequencyNDays: 7 });
    await comp.submitOrigination();
    expect(loansService.originate).toHaveBeenCalledWith(expect.objectContaining({
      paymentFrequency: 'Monthly', frequencyNDays: null, installmentCount: 2,
    }));
  });

  it('submits loan origination and emits loanCreated', async () => {
    const fixture = TestBed.createComponent(LoanOriginationModalComponent);
    const comp = fixture.componentInstance;
    comp.isOpen = true;
    await comp.initModal();

    comp.form.patchValue({
      customerId: 'cust-1',
      loanTemplateId: 'tpl-1',
      principalAmount: 500000,
      interestRate: 10,
      installmentCount: 20,
      paymentFrequency: 'Daily',
      startDate: '2026-11-01',
    });

    let createdLoan: unknown = null;
    comp.loanCreated.subscribe((l) => (createdLoan = l));

    await comp.submitOrigination();

    expect(loansService.originate).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: 'cust-1',
        principalAmount: 500000,
        installmentCount: 20,
      })
    );
    expect(createdLoan).toBeTruthy();
  });
});
