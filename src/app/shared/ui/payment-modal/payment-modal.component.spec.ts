import { CustomersService } from '../../../features/customers/data/customers.service';
import { TestBed } from '@angular/core/testing';
import { PaymentModalComponent } from './payment-modal.component';
import { PaymentsService } from '../../../features/payments/data/payments.service';
import { LoanDetails } from '../../../features/loans/data/loan.models';

describe('PaymentModalComponent', () => {
  const mockLoan: LoanDetails = {
    id: 'loan-1',
    customerId: 'cust-1',
    customerName: 'Pedro Gómez',
    routeId: 'route-1',
    routeName: 'Ruta 1',
    status: 'Active',
    principalAmount: 500000,
    interestRate: 15,
    interestAmount: 75000,
    totalAmount: 575000,
    paidAmount: 0,
    balanceAmount: 575000,
    paymentFrequency: 'Daily',
    installmentCount: 20,
    startsAtUtc: '2026-11-01T00:00:00Z',
    dueAtUtc: '2026-11-21T00:00:00Z',
    createdByUserId: 'user-1',
    createdByRole: 'Collector',
    createdAtUtc: new Date().toISOString(),
    installments: [
      { id: 'inst-1', number: 1, dueDate: '2026-11-02', expectedAmount: 28750, paidAmount: 0, status: 'Pending' },
      { id: 'inst-2', number: 2, dueDate: '2026-11-03', expectedAmount: 28750, paidAmount: 0, status: 'Pending' },
    ],
  };

  const paymentsService = {
    getPaymentMethods: vi.fn().mockResolvedValue([
      { id: 'pm-1', name: 'Efectivo', displayOrder: 1 },
      { id: 'pm-2', name: 'Transferencia', displayOrder: 2 },
    ]),
    registerPayment: vi.fn().mockResolvedValue({
      id: 'pay-1',
      loanId: 'loan-1',
      amount: 28750,
      paymentMethodId: 'pm-1',
      paymentMethodName: 'Efectivo',
      remainingLoanBalance: 546250,
      loanStatus: 'Active',
      allocations: [{ installmentNumber: 1, amountAllocated: 28750, isFullyCovered: true }],
    }),
    attachEvidence: vi.fn().mockResolvedValue({}),
    listByLoan: vi.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    await TestBed.configureTestingModule({
      imports: [PaymentModalComponent],
      providers: [
        { provide: PaymentsService, useValue: paymentsService },
        { provide: CustomersService, useValue: { get: vi.fn().mockResolvedValue({ identification: '001234567', businessOrWorkName: '  Nombre registrado  ' }) } },
      ],
    }).compileComponents();
  });

  it('initializes default payment amount and methods on modal open', async () => {
    const fixture = TestBed.createComponent(PaymentModalComponent);
    const comp = fixture.componentInstance;
    comp.isOpen = true;
    comp.loan = mockLoan;
    await comp.initModal();
    fixture.detectChanges();

    expect(paymentsService.getPaymentMethods).toHaveBeenCalled();
    expect(comp.paymentMethods()).toHaveLength(2);
    expect(comp.form.controls.amount.value).toBe(28750);
    expect(comp.form.controls.paymentMethodId.value).toBe('pm-1');
    expect(comp.allocationPreview().length).toBeGreaterThan(0);
  });

  it('updates cascade preview when amount changes', async () => {
    const fixture = TestBed.createComponent(PaymentModalComponent);
    const comp = fixture.componentInstance;
    comp.isOpen = true;
    comp.loan = mockLoan;
    await comp.initModal();

    comp.form.patchValue({ amount: 57500 });
    comp.onAmountChanged();

    expect(comp.allocationPreview()).toHaveLength(2);
    expect(comp.allocationPreview()[0].isFullyCovered).toBe(true);
    expect(comp.allocationPreview()[1].isFullyCovered).toBe(true);
  });

  it('hides optional fields initially and preserves their values when toggled', async () => {
    const fixture = TestBed.createComponent(PaymentModalComponent);
    const comp = fixture.componentInstance;
    comp.isOpen = true; comp.loan = mockLoan; await comp.initModal(); fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('#paymentNotes')).toBeNull();
    expect(root.querySelector('#evidenceFile')).toBeNull();
    (root.querySelector('.btn-optionals') as HTMLButtonElement).click(); fixture.detectChanges();
    expect(root.querySelector('#paymentNotes')).toBeTruthy();
    expect(root.querySelector('#evidenceFile')).toBeTruthy();
    comp.form.controls.notes.setValue('Recibo entregado');
    comp.evidenceFileName.set('foto.png');
    (root.querySelector('.btn-optionals') as HTMLButtonElement).click(); fixture.detectChanges();
    expect(root.querySelector('#paymentNotes')).toBeNull();
    expect(comp.form.controls.notes.value).toBe('Recibo entregado');
    expect(comp.evidenceFileName()).toBe('foto.png');
    await comp.initModal(); expect(comp.showOptionals()).toBe(false);
  });

  it('adds the actual remaining amounts including partial payments and the final rounding installment', async () => {
    const fixture = TestBed.createComponent(PaymentModalComponent);
    const comp = fixture.componentInstance;
    comp.isOpen = true;
    comp.loan = { ...mockLoan, balanceAmount: 80.01, installments: [
      { ...mockLoan.installments[0], number: 3, expectedAmount: 30.01, paidAmount: 0 },
      { ...mockLoan.installments[0], number: 1, expectedAmount: 30, paidAmount: 10, status: 'PartiallyPaid' },
      { ...mockLoan.installments[0], number: 2, expectedAmount: 30, paidAmount: 0 },
    ] };
    await comp.initModal(); fixture.detectChanges();
    expect(comp.form.controls.amount.value).toBe(20);
    const root = fixture.nativeElement as HTMLElement;
    (root.querySelector('[aria-label="Abonar 2 cuotas"]') as HTMLButtonElement).click();
    expect(comp.form.controls.amount.value).toBe(50);
    expect(comp.allocationPreview()).toHaveLength(2);
    const custom = root.querySelector('#paymentInstallmentCount') as HTMLInputElement;
    custom.value = '3'; custom.dispatchEvent(new Event('input'));
    expect(comp.form.controls.amount.value).toBe(80.01);
    expect(comp.allocationPreview()).toHaveLength(3);
    expect((root.querySelector('[aria-label="Abonar 4 cuotas"]') as HTMLButtonElement).disabled).toBe(true);
    comp.selectInstallmentCount(4); expect(comp.installmentCountError()).toBeTruthy();
    expect(comp.form.controls.amount.value).toBe(80.01);
    comp.selectInstallmentCount(1.5); expect(comp.installmentCountError()).toBeTruthy();
    comp.form.controls.amount.setValue(15); comp.onAmountChanged();
    expect(comp.selectedInstallmentCount()).toBeNull(); expect(comp.installmentCountError()).toBe('');
    expect(comp.allocationPreview()[0].newAllocatedAmount).toBe(15);
  });

  it('generates voucher on submit, allows correction and confirms payment', async () => {
    const fixture = TestBed.createComponent(PaymentModalComponent);
    const comp = fixture.componentInstance;
    comp.isOpen = true;
    comp.loan = mockLoan;
    await comp.initModal();

    let successPayload: unknown = null;
    comp.paymentSuccess.subscribe((p) => (successPayload = p));

    // 1. Submit form -> proceeds to voucher preview step without registering payment yet
    await comp.submitPayment();

    expect(comp.voucherStep()).toBe(true);
    expect(comp.voucherData()).toBeTruthy();
    expect(comp.voucherData()?.customerIdentification).toBe('001234567');
    expect(comp.voucherData()?.customerName).toBe('Nombre registrado');
    expect(comp.voucherImage()).toBeTruthy();
    expect(paymentsService.registerPayment).not.toHaveBeenCalled();

    // 2. Can correct payment -> returns to form
    comp.correctPayment();
    expect(comp.voucherStep()).toBe(false);

    // 3. Submit again and confirm payment
    await comp.submitPayment();
    expect(comp.voucherStep()).toBe(true);

    await comp.confirmPaymentOnly();

    expect(paymentsService.registerPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        loanId: 'loan-1',
        amount: 28750,
        paymentMethodId: 'pm-1',
        idempotencyKey: expect.any(String),
      })
    );
    expect(successPayload).toBeTruthy();
    expect(comp.successPayment()).toBeTruthy();
    expect(comp.voucherStep()).toBe(false);
  });
});
