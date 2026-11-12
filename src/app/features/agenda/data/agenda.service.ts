import { Injectable, inject } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { API_CONFIG } from '../../../core/config/api.config';
import {
  AgendaResponse,
  CustomerMapLocation,
  NonPaymentReason,
  PortfolioAnalytics,
  RegisterWillNotPayRequest,
} from './agenda.models';

@Injectable({ providedIn: 'root' })
export class AgendaService {
  private readonly auth = inject(AuthService);
  private readonly config = inject(API_CONFIG);

  async getAgenda(
    routeId?: string,
    targetDate?: string,
    originLat?: number,
    originLon?: number,
  ): Promise<AgendaResponse> {
    const query = new URLSearchParams();
    if (routeId) query.set('routeId', routeId);
    if (targetDate) query.set('targetDate', targetDate);
    if (originLat !== undefined && originLat !== null) query.set('originLat', originLat.toString());
    if (originLon !== undefined && originLon !== null) query.set('originLon', originLon.toString());

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const response = await this.auth.authorizedFetch(`${this.config.baseUrl}/agenda${queryString}`);
    if (!response.ok) throw new Error(await this.message(response, 'No fue posible consultar la agenda diaria.'));
    return (await response.json()) as AgendaResponse;
  }

  async getMapLocations(routeId?: string, targetDate?: string): Promise<readonly CustomerMapLocation[]> {
    const query = new URLSearchParams();
    if (routeId) query.set('routeId', routeId);
    if (targetDate) query.set('targetDate', targetDate);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const response = await this.auth.authorizedFetch(`${this.config.baseUrl}/agenda/map-locations${queryString}`);
    if (!response.ok) throw new Error(await this.message(response, 'No fue posible consultar los puntos del mapa.'));
    return (await response.json()) as readonly CustomerMapLocation[];
  }

  async optimizeSequence(
    originLat: number,
    originLon: number,
    routeId?: string,
    targetDate?: string,
  ): Promise<AgendaResponse> {
    const response = await this.auth.authorizedFetch(`${this.config.baseUrl}/agenda/optimize-sequence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        routeId: routeId ?? null,
        targetDate: targetDate ?? null,
        originLatitude: originLat,
        originLongitude: originLon,
      }),
    });
    if (!response.ok) throw new Error(await this.message(response, 'No fue posible optimizar la secuencia de la ruta.'));
    return (await response.json()) as AgendaResponse;
  }

  async getRouteAnalytics(routeId?: string, targetDate?: string): Promise<PortfolioAnalytics> {
    const query = new URLSearchParams();
    if (routeId) query.set('routeId', routeId);
    if (targetDate) query.set('targetDate', targetDate);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const response = await this.auth.authorizedFetch(`${this.config.baseUrl}/agenda/route-analytics${queryString}`);
    if (!response.ok) throw new Error(await this.message(response, 'No fue posible consultar la analítica de ruta.'));
    return (await response.json()) as PortfolioAnalytics;
  }

  async getNonPaymentReasons(includeInactive = false): Promise<readonly NonPaymentReason[]> {
    const query = new URLSearchParams();
    if (includeInactive) query.set('includeInactive', 'true');
    const queryString = query.toString() ? `?${query.toString()}` : '';
    const response = await this.auth.authorizedFetch(`${this.config.baseUrl}/agenda/non-payment-reasons${queryString}`);
    if (!response.ok) throw new Error(await this.message(response, 'No fue posible consultar los motivos de no pago.'));
    return (await response.json()) as readonly NonPaymentReason[];
  }

  async createNonPaymentReason(name: string, description?: string, displayOrder = 0): Promise<NonPaymentReason> {
    const response = await this.auth.authorizedFetch(`${this.config.baseUrl}/agenda/non-payment-reasons`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description: description ?? null, displayOrder }),
    });
    if (!response.ok) throw new Error(await this.message(response, 'No fue posible crear el motivo de no pago.'));
    return (await response.json()) as NonPaymentReason;
  }

  async toggleNonPaymentReasonStatus(id: string, isActive: boolean): Promise<NonPaymentReason> {
    const response = await this.auth.authorizedFetch(`${this.config.baseUrl}/agenda/non-payment-reasons/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive }),
    });
    if (!response.ok) throw new Error(await this.message(response, 'No fue posible actualizar el estado del motivo.'));
    return (await response.json()) as NonPaymentReason;
  }

  async registerWillNotPay(request: RegisterWillNotPayRequest): Promise<boolean> {
    const response = await this.auth.authorizedFetch(`${this.config.baseUrl}/agenda/will-not-pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error(await this.message(response, 'No fue posible registrar la marca de no pagará hoy.'));
    return (await response.json()) as boolean;
  }

  async cancelWillNotPay(routeId: string, customerId: string, loanId: string | null | undefined, businessDate: string): Promise<boolean> {
    const query = new URLSearchParams({
      routeId,
      customerId,
      businessDate,
    });
    if (loanId) query.set('loanId', loanId);

    const response = await this.auth.authorizedFetch(`${this.config.baseUrl}/agenda/will-not-pay?${query.toString()}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error(await this.message(response, 'No fue posible desmarcar el no pago.'));
    return (await response.json()) as boolean;
  }

  private async message(response: Response, fallback: string): Promise<string> {
    try {
      const data = await response.json();
      return data?.detail ?? data?.title ?? data?.message ?? fallback;
    } catch {
      return fallback;
    }
  }
}
