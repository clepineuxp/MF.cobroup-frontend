export interface LoanVoucherInstallment {
  readonly number: number;
  readonly dueDate: string;
  readonly expectedAmount: number;
}

export interface LoanVoucherData {
  readonly customerName: string;
  readonly customerIdentification?: string;
  readonly customerPhone?: string;
  readonly routeName?: string;
  readonly principalAmount: number; // Monto prestado / Total del crédito
  readonly interestRate: number;
  readonly totalAmount: number; // Total a pagar
  readonly installmentCount: number;
  readonly paymentFrequency: string; // 'Diario' | 'Semanal' | etc.
  readonly frequencyNDays?: number | null;
  readonly startDate: string;
  readonly microinsuranceAmount: number; // Total microseguro
  readonly netDisbursedAmount: number; // Total entregado al cliente (principal - microseguro)
  readonly installments: readonly LoanVoucherInstallment[];
}

export interface GeneratedLoanVoucher {
  readonly dataUrl: string;
  readonly blob: Blob;
}

export function formatCurrencyCop(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatFrequencyLabel(freq: string, nDays?: number | null): string {
  switch (freq) {
    case 'Daily': return 'Diario';
    case 'Weekly': return 'Semanal';
    case 'Monthly': return 'Mensual';
    case 'EveryNDays': return nDays ? `Cada ${nDays} días` : 'Cada N días';
    default: return freq;
  }
}

/**
 * Generates a clean, high-resolution voucher image (PNG) on HTML5 Canvas.
 * Handles headless / test environments gracefully without failing.
 */
export async function generateLoanVoucherImage(data: LoanVoucherData): Promise<GeneratedLoanVoucher> {
  if (typeof document === 'undefined') {
    const dummyBlob = new Blob(['dummy'], { type: 'image/png' });
    return { dataUrl: 'data:image/png;base64,dummy', blob: dummyBlob };
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    const dummyBlob = new Blob(['dummy'], { type: 'image/png' });
    return { dataUrl: 'data:image/png;base64,dummy', blob: dummyBlob };
  }

  const isMultiColumn = data.installments.length > 20;
  const rowsCount = isMultiColumn ? Math.ceil(data.installments.length / 2) : data.installments.length;

  const width = 640;
  const rowHeight = 28;
  const headerHeight = 150;
  const clientBoxHeight = 85;
  const financialBoxHeight = 175;
  const tableHeaderHeight = 40;
  const tableHeight = rowsCount * rowHeight;
  const footerHeight = 80;

  const height = headerHeight + clientBoxHeight + financialBoxHeight + tableHeaderHeight + tableHeight + footerHeight;

  // Scale 2x for sharp retina text
  const scale = 2;
  canvas.width = width * scale;
  canvas.height = height * scale;
  ctx.scale(scale, scale);

  // Background (White background requested)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Outer border & subtle container
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, width - 20, height - 20);

  // --- HEADER ---
  let y = 35;
  // App brand badge
  ctx.fillStyle = '#0284c7'; // Brand sky blue
  ctx.font = 'bold 12px Inter, system-ui, sans-serif';
  ctx.letterSpacing = '2px';
  ctx.textAlign = 'center';
  ctx.fillText('COBROUP · SISTEMA DE GESTIÓN', width / 2, y);

  y += 30;
  // Title
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 22px Inter, system-ui, sans-serif';
  ctx.letterSpacing = '0px';
  ctx.fillText('PLAN DE PAGOS Y COMPROBANTE', width / 2, y);

  y += 24;
  // Route / Date subtitle
  ctx.fillStyle = '#64748b';
  ctx.font = '13px Inter, system-ui, sans-serif';
  const subtitle = `${data.routeName ? `${data.routeName} · ` : ''}Fecha inicio: ${data.startDate}`;
  ctx.fillText(subtitle, width / 2, y);

  y += 20;
  // Divider
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(30, y);
  ctx.lineTo(width - 30, y);
  ctx.stroke();

  // --- CLIENT BOX ---
  y += 18;
  const clientBoxY = y;
  ctx.fillStyle = '#f8fafc';
  drawRoundedRect(ctx, 30, clientBoxY, width - 60, clientBoxHeight, 8);
  ctx.fill();
  ctx.strokeStyle = '#e2e8f0';
  ctx.stroke();

  ctx.textAlign = 'left';
  // Client Name
  ctx.fillStyle = '#64748b';
  ctx.font = '11px Inter, system-ui, sans-serif';
  ctx.fillText('CLIENTE', 48, clientBoxY + 24);
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 15px Inter, system-ui, sans-serif';
  ctx.fillText(truncateText(ctx, data.customerName, 320), 48, clientBoxY + 44);

  // Client ID
  ctx.fillStyle = '#64748b';
  ctx.font = '11px Inter, system-ui, sans-serif';
  ctx.fillText('IDENTIFICACIÓN', 370, clientBoxY + 24);
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 13px Inter, system-ui, sans-serif';
  ctx.fillText(data.customerIdentification || 'N/A', 370, clientBoxY + 42);

  // Client Phone
  ctx.fillStyle = '#64748b';
  ctx.font = '11px Inter, system-ui, sans-serif';
  ctx.fillText('TELÉFONO', 490, clientBoxY + 24);
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 13px Inter, system-ui, sans-serif';
  ctx.fillText(data.customerPhone || 'N/A', 490, clientBoxY + 42);

  // --- FINANCIAL SUMMARY BOX ---
  y = clientBoxY + clientBoxHeight + 15;
  const finBoxY = y;
  ctx.fillStyle = '#f8fafc';
  drawRoundedRect(ctx, 30, finBoxY, width - 60, financialBoxHeight, 8);
  ctx.fill();
  ctx.strokeStyle = '#e2e8f0';
  ctx.stroke();

  // Left Column
  // 1. Total Crédito (Monto Prestado)
  ctx.fillStyle = '#64748b';
  ctx.font = '11px Inter, system-ui, sans-serif';
  ctx.fillText('TOTAL DEL CRÉDITO (PRESTADO)', 48, finBoxY + 26);
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 17px Inter, system-ui, sans-serif';
  ctx.fillText(formatCurrencyCop(data.principalAmount), 48, finBoxY + 48);

  // 2. Total Microseguro
  ctx.fillStyle = '#64748b';
  ctx.font = '11px Inter, system-ui, sans-serif';
  ctx.fillText('TOTAL MICROSEGURO', 48, finBoxY + 76);
  ctx.fillStyle = data.microinsuranceAmount > 0 ? '#0284c7' : '#64748b';
  ctx.font = 'bold 15px Inter, system-ui, sans-serif';
  ctx.fillText(formatCurrencyCop(data.microinsuranceAmount), 48, finBoxY + 96);

  // 3. Total Entregado al Cliente (Highlighted)
  ctx.fillStyle = '#16a34a'; // Green
  ctx.font = 'bold 11px Inter, system-ui, sans-serif';
  ctx.fillText('TOTAL ENTREGADO AL CLIENTE', 48, finBoxY + 128);
  ctx.fillStyle = '#16a34a';
  ctx.font = 'bold 20px Inter, system-ui, sans-serif';
  ctx.fillText(formatCurrencyCop(data.netDisbursedAmount), 48, finBoxY + 152);

  // Right Column
  // 4. Total a Pagar
  ctx.fillStyle = '#64748b';
  ctx.font = '11px Inter, system-ui, sans-serif';
  ctx.fillText('TOTAL A PAGAR', 350, finBoxY + 26);
  ctx.fillStyle = '#b45309'; // Amber highlight
  ctx.font = 'bold 19px Inter, system-ui, sans-serif';
  ctx.fillText(formatCurrencyCop(data.totalAmount), 350, finBoxY + 48);

  // 5. Tasa de Interés
  ctx.fillStyle = '#64748b';
  ctx.font = '11px Inter, system-ui, sans-serif';
  ctx.fillText('TASA DE INTERÉS', 350, finBoxY + 76);
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 15px Inter, system-ui, sans-serif';
  ctx.fillText(`${data.interestRate}%`, 350, finBoxY + 96);

  // 6. Modalidad y Cuotas
  ctx.fillStyle = '#64748b';
  ctx.font = '11px Inter, system-ui, sans-serif';
  ctx.fillText('MODALIDAD DE PAGO', 350, finBoxY + 128);
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 14px Inter, system-ui, sans-serif';
  const freqDesc = `${formatFrequencyLabel(data.paymentFrequency, data.frequencyNDays)} · ${data.installmentCount} cuotas`;
  ctx.fillText(freqDesc, 350, finBoxY + 150);

  // --- PLAN DE PAGOS (TABLE) ---
  y = finBoxY + financialBoxHeight + 20;

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 14px Inter, system-ui, sans-serif';
  ctx.fillText('PLAN DE PAGOS', 30, y);

  y += 10;

  if (isMultiColumn) {
    // 2-column layout
    const colWidth = (width - 70) / 2;
    drawTableHeader(ctx, 30, y, colWidth);
    drawTableHeader(ctx, 40 + colWidth, y, colWidth);
    y += tableHeaderHeight;

    const mid = Math.ceil(data.installments.length / 2);
    for (let i = 0; i < mid; i++) {
      const inst1 = data.installments[i];
      const rowY = y + i * rowHeight;
      drawTableRow(ctx, 30, rowY, colWidth, inst1, i % 2 === 0);

      const inst2Index = mid + i;
      if (inst2Index < data.installments.length) {
        const inst2 = data.installments[inst2Index];
        drawTableRow(ctx, 40 + colWidth, rowY, colWidth, inst2, i % 2 === 0);
      }
    }
    y += rowsCount * rowHeight;
  } else {
    // Single column layout
    const fullColWidth = width - 60;
    drawTableHeader(ctx, 30, y, fullColWidth);
    y += tableHeaderHeight;

    for (let i = 0; i < data.installments.length; i++) {
      const inst = data.installments[i];
      const rowY = y + i * rowHeight;
      drawTableRow(ctx, 30, rowY, fullColWidth, inst, i % 2 === 0);
    }
    y += tableHeight;
  }

  // --- FOOTER ---
  y += 20;
  ctx.strokeStyle = '#e2e8f0';
  ctx.beginPath();
  ctx.moveTo(30, y);
  ctx.lineTo(width - 30, y);
  ctx.stroke();

  y += 25;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#64748b';
  ctx.font = '12px Inter, system-ui, sans-serif';
  ctx.fillText('CobroUp · Comprobante oficial de crédito', width / 2, y);

  y += 18;
  ctx.fillStyle = '#94a3b8';
  ctx.font = '11px Inter, system-ui, sans-serif';
  const nowStr = new Date().toLocaleString('es-CO');
  ctx.fillText(`Emitido el ${nowStr}`, width / 2, y);

  const dataUrl = canvas.toDataURL('image/png');
  const blob = await new Promise<Blob>((resolve) => {
    canvas.toBlob((b) => resolve(b || new Blob(['dummy'], { type: 'image/png' })), 'image/png');
  });

  return { dataUrl, blob };
}

function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 0 && ctx.measureText(`${truncated}…`).width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return `${truncated}…`;
}

function drawTableHeader(ctx: CanvasRenderingContext2D, x: number, y: number, w: number): void {
  ctx.fillStyle = '#f1f5f9';
  drawRoundedRect(ctx, x, y, w, 28, 4);
  ctx.fill();
  ctx.strokeStyle = '#e2e8f0';
  ctx.stroke();

  ctx.fillStyle = '#475569';
  ctx.font = 'bold 11px Inter, system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('CUOTA', x + 10, y + 18);
  ctx.fillText('FECHA', x + 65, y + 18);
  ctx.textAlign = 'right';
  ctx.fillText('VALOR', x + w - 10, y + 18);
}

function drawTableRow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  inst: LoanVoucherInstallment,
  alternate: boolean
): void {
  if (alternate) {
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(x, y, w, 26);
  }

  ctx.fillStyle = '#475569';
  ctx.font = '12px Inter, system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`#${inst.number}`, x + 10, y + 17);
  ctx.fillText(inst.dueDate, x + 65, y + 17);
  ctx.textAlign = 'right';
  ctx.font = 'bold 12px Inter, system-ui, sans-serif';
  ctx.fillStyle = '#0f172a';
  ctx.fillText(formatCurrencyCop(inst.expectedAmount), x + w - 10, y + 17);
}

/**
 * Handles sharing / downloading the voucher image and optional WhatsApp dispatch.
 */
export async function shareLoanVoucher(voucher: GeneratedLoanVoucher, data: LoanVoucherData): Promise<void> {
  const safeName = (data.customerName || 'cliente').toLowerCase().replace(/[^a-z0-9]/g, '_');
  const fileName = `comprobante_credito_${safeName}.png`;
  const file = new File([voucher.blob], fileName, { type: 'image/png' });

  // 1. Try Web Share API (mobile native share dialog)
  if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        title: 'Comprobante de Crédito - CobroUp',
        text: `Comprobante de crédito para ${data.customerName}. Total: ${formatCurrencyCop(data.totalAmount)}`,
        files: [file],
      });
      return;
    } catch (err: any) {
      if (err?.name === 'AbortError') return; // User closed share sheet
    }
  }

  // 2. Download the image file directly
  if (typeof document !== 'undefined') {
    const link = document.createElement('a');
    link.href = voucher.dataUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // 3. If customer phone is available, open WhatsApp with summary
  if (data.customerPhone && typeof window !== 'undefined') {
    const rawDigits = data.customerPhone.replace(/[^0-9]/g, '');
    let phoneParam = rawDigits;
    if (rawDigits.length === 10) {
      phoneParam = `57${rawDigits}`; // Colombia standard
    }
    const message =
      `*Comprobante de Crédito - CobroUp*\n\n` +
      `Estimado/a ${data.customerName}:\n` +
      `• *Total del Crédito:* ${formatCurrencyCop(data.principalAmount)}\n` +
      `• *Microseguro:* ${formatCurrencyCop(data.microinsuranceAmount)}\n` +
      `• *Total Entregado:* ${formatCurrencyCop(data.netDisbursedAmount)}\n` +
      `• *Total a Pagar:* ${formatCurrencyCop(data.totalAmount)} (${data.installmentCount} cuotas ${formatFrequencyLabel(data.paymentFrequency, data.frequencyNDays).toLowerCase()})\n\n` +
      `El comprobante gráfico en imagen ha sido descargado. ¡Gracias por su preferencia!`;
    const waUrl = phoneParam
      ? `https://wa.me/${phoneParam}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  }
}

