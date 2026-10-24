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
      items: [{ id: 'cust-1', routeId: 'route-1', identification: '001234567', firstNames: 'Ana', lastNames: 'Pérez', status: 'Active' }],
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
    comp.selectCustomer(comp.customers()[0]); await fixture.whenStable();
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

  it('filters names without accents and selects an actual customer with the keyboard', async () => {
    const fixture = TestBed.createComponent(LoanOriginationModalComponent);
    const comp = fixture.componentInstance; comp.isOpen = true; await comp.initModal(); fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('[role="combobox"]') as HTMLInputElement;
    input.value = 'perez'; input.dispatchEvent(new Event('input')); fixture.detectChanges();
    expect(comp.customerMatches()).toHaveLength(1);
    expect(comp.form.controls.customerId.value).toBe('');
    expect(input.getAttribute('aria-expanded')).toBe('true');
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })); fixture.detectChanges();
    expect(comp.form.controls.customerId.value).toBe('cust-1'); expect(input.value).toBe('Ana Pérez');
    expect(comp.customerOptionsOpen()).toBe(false);
    expect(comp.availableTemplates).toHaveLength(1);
    expect(comp.form.controls.principalAmount.value).toBeNull();
  });

  it('debounces server search and can select a customer outside the initial results', async () => {
    const fixture = TestBed.createComponent(LoanOriginationModalComponent); const comp = fixture.componentInstance;
    await comp.initModal();
    const extra = { ...comp.customers()[0], id: 'cust-remote', identification: '001234567', firstNames: 'Carlos', lastNames: 'Remoto' };
    customersService.search.mockResolvedValueOnce({ items: [extra], page: 1, pageSize: 100, totalCount: 1 });
    comp.searchCustomers('Car'); comp.searchCustomers('Carlos');
    await vi.waitFor(() => expect(comp.customerSearching()).toBe(false));
    expect(customersService.search).toHaveBeenCalledWith('', 'Carlos', 1, 100);
    expect(customersService.search).not.toHaveBeenCalledWith('', 'Car', 1, 100);
    expect(comp.customerMatches().map(item => item.id)).toEqual(['cust-remote']);
    comp.selectCustomer(extra); expect(comp.form.controls.customerId.value).toBe('cust-remote');
    expect(comp.availableTemplates).toHaveLength(1);
  });

  it('clears the selected customer and dependent IDs when typing another search', async () => {
    const comp = TestBed.createComponent(LoanOriginationModalComponent).componentInstance; await comp.initModal();
    comp.selectCustomer(comp.customers()[0]);
    comp.form.patchValue({ loanTemplateId: 'tpl-1', exceptionRequestId: 'exc-1' });
    comp.searchCustomers('another');
    expect(comp.form.controls.customerId.value).toBe('');
    expect(comp.form.controls.loanTemplateId.value).toBe('');
    expect(comp.form.controls.exceptionRequestId.value).toBe('');
    expect(comp.form.invalid).toBe(true);
    comp.close(); expect(comp.customerOptionsOpen()).toBe(false);
  });

  it('ignores a late search response after selection and allows recovery from network errors', async () => {
    const comp = TestBed.createComponent(LoanOriginationModalComponent).componentInstance; await comp.initModal();
    let fail!: (error: Error) => void;
    customersService.search.mockImplementationOnce(() => new Promise((_, reject) => { fail = reject; }));
    comp.searchCustomers('offline');
    await vi.waitFor(() => expect(fail).toBeDefined());
    fail(new Error('offline'));
    await vi.waitFor(() => expect(comp.customerSearchError()).toContain('búsqueda'));
    const chosen = comp.customers()[0];
    let finish!: (result: Awaited<ReturnType<CustomersService['search']>>) => void;
    customersService.search.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    comp.searchCustomers('Ana'); await vi.waitFor(() => expect(finish).toBeDefined());
    comp.selectCustomer(chosen); finish({ items: [], page: 1, pageSize: 100, totalCount: 0 });
    await Promise.resolve();
    expect(comp.form.controls.customerId.value).toBe(chosen.id);
    expect(comp.customerQuery()).toBe('Ana Pérez'); expect(comp.customerOptionsOpen()).toBe(false);
    expect(comp.customerSearchError()).toBe('');
  });
});
