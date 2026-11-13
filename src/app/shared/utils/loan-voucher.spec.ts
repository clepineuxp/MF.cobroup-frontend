import { generateLoanStatusVoucherImage, LoanStatusVoucherData } from './loan-voucher';

describe('loan status voucher', () => {
  afterEach(() => vi.restoreAllMocks());

  it.each([false, true])('renders identification and payment history without a payment plan (has payments: %s)', async (hasPayments) => {
    const fillText = vi.fn();
    const methods = new Map<string, ReturnType<typeof vi.fn>>();
    const context = new Proxy({ fillText, measureText: (text: string) => ({ width: text.length * 6 }) }, {
      get(target, key) {
        if (key in target) return Reflect.get(target, key);
        const name = String(key);
        if (!methods.has(name)) methods.set(name, vi.fn());
        return methods.get(name);
      },
    });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,test');
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => callback(new Blob(['image'], { type: 'image/png' })));
    const data: LoanStatusVoucherData = {
      customerName: 'Ana Pérez', customerIdentification: '001234567', customerPhone: '3001234567',
      principalAmount: 100000, totalAmount: 100000, balanceAmount: hasPayments ? 75000 : 100000,
      totalPaidAmount: hasPayments ? 25000 : 0, startDate: '2026-11-01',
      paymentHistory: hasPayments ? [{ date: '2026-11-13', amount: 25000, paymentMethodName: 'Efectivo' }] : [],
    };
    await generateLoanStatusVoucherImage(data);
    const texts = fillText.mock.calls.map(call => String(call[0]));
    expect(texts).toContain('001234567');
    expect(texts).toContain(`HISTORIAL DE PAGOS (${hasPayments ? 1 : 0})`);
    expect(texts.some(text => /CUOTAS PENDIENTES|PLAN DE PAGOS|VENCIMIENTO/i.test(text))).toBe(false);
    expect(texts).toContain(hasPayments ? 'Efectivo' : 'Sin pagos registrados hasta la fecha');
  });
});
