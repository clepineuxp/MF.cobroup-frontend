import { Injectable, inject } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { API_CONFIG } from '../../../core/config/api.config';
import {
  AttachPaymentEvidenceRequest,
  DailyReconciliationReport,
  PaymentDetails,
  PaymentMethodItem,
  RegisterPaymentRequest,
} from './payment.models';

@Injectable({ providedIn: 'root' })
export class PaymentsService {
  private readonly auth = inject(AuthService);
  private readonly config = inject(API_CONFIG);

  async getPaymentMethods(): Promise<readonly PaymentMethodItem[]> {
    const response = await this.auth.authorizedFetch(`${this.config.baseUrl}/payments/payment-methods`);
    if (!response.ok) throw new Error(await this.message(response, 'No fue posible consultar los medios de pago.'));
    return (await response.json()) as readonly PaymentMethodItem[];
  }

  async registerPayment(request: RegisterPaymentRequest): Promise<PaymentDetails> {
    const response = await this.auth.authorizedFetch(`${this.config.baseUrl}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error(await this.message(response, 'No fue posible registrar el cobro.'));
    return (await response.json()) as PaymentDetails;
  }

  async listByLoan(loanId: string): Promise<readonly PaymentDetails[]> {
    const response = await this.auth.authorizedFetch(`${this.config.baseUrl}/payments/by-loan/${loanId}`);
    if (!response.ok) throw new Error(await this.message(response, 'No fue posible consultar los pagos del préstamo.'));
    return (await response.json()) as readonly PaymentDetails[];
  }

  async getDailyReconciliation(routeId: string, date?: string): Promise<DailyReconciliationReport> {
    const query = new URLSearchParams({ routeId });
    if (date) query.set('date', date);

    const response = await this.auth.authorizedFetch(`${this.config.baseUrl}/payments/daily-reconciliation?${query}`);
    if (!response.ok) throw new Error(await this.message(response, 'No fue posible consultar la conciliación diaria.'));
    return (await response.json()) as DailyReconciliationReport;
  }

  async attachEvidence(paymentId: string, request: AttachPaymentEvidenceRequest): Promise<PaymentDetails> {
    const response = await this.auth.authorizedFetch(`${this.config.baseUrl}/payments/${paymentId}/evidence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error(await this.message(response, 'No fue posible adjuntar la evidencia del cobro.'));
    return (await response.json()) as PaymentDetails;
  }

  async deleteEvidence(paymentId: string, evidenceId: string, reason: string): Promise<PaymentDetails> {
    const response = await this.auth.authorizedFetch(`${this.config.baseUrl}/payments/${paymentId}/evidence/${evidenceId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    if (!response.ok) throw new Error(await this.message(response, 'No fue posible retirar la evidencia.'));
    return (await response.json()) as PaymentDetails;
  }

  private async message(response: Response, fallback: string): Promise<string> {
    if (response.status === 403) return 'No tienes autorización para operar sobre este préstamo o ruta.';
    if (response.status === 404) return 'No se encontró el recurso solicitado.';
    const detail = (await response.json().catch(() => null)) as { message?: string } | null;
    return detail?.message ?? fallback;
  }
}
