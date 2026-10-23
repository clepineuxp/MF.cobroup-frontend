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
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    await TestBed.configureTestingModule({
      imports: [PaymentModalComponent],
      providers: [
        { provide: PaymentsService, useValue: paymentsService },
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

  it('submits payment with client UUID idempotency key and displays receipt', async () => {
    const fixture = TestBed.createComponent(PaymentModalComponent);
    const comp = fixture.componentInstance;
    comp.isOpen = true;
    comp.loan = mockLoan;
    await comp.initModal();

    let successPayload: unknown = null;
    comp.paymentSuccess.subscribe((p) => (successPayload = p));

    await comp.submitPayment();

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
  });
});
