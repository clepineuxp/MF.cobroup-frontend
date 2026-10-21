import { Injectable, inject } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { API_CONFIG } from '../../../core/config/api.config';
import { CreateLoanExceptionRequest, LoanExceptionItem, LoanExceptionSearchResponse } from './loan-exception.models';

@Injectable({ providedIn: 'root' })
export class LoanExceptionsService {
  private readonly auth = inject(AuthService);
  private readonly config = inject(API_CONFIG);

  async search(routeId?: string, customerId?: string, status?: string, page = 1, pageSize = 25): Promise<LoanExceptionSearchResponse> {
    const query = new URLSearchParams({ page: page.toString(), pageSize: pageSize.toString() });
    if (routeId) query.set('routeId', routeId);
    if (customerId) query.set('customerId', customerId);
    if (status) query.set('status', status);

    const response = await this.auth.authorizedFetch(`${this.config.baseUrl}/loan-exceptions?${query}`);
    if (!response.ok) throw new Error(await this.message(response, 'No fue posible consultar las solicitudes de excepción.'));
    return (await response.json()) as LoanExceptionSearchResponse;
  }

  async get(id: string): Promise<LoanExceptionItem> {
    const response = await this.auth.authorizedFetch(`${this.config.baseUrl}/loan-exceptions/${id}`);
    if (!response.ok) throw new Error(await this.message(response, 'No fue posible consultar la excepción.'));
    return (await response.json()) as LoanExceptionItem;
  }

  async create(request: CreateLoanExceptionRequest): Promise<LoanExceptionItem> {
    const response = await this.auth.authorizedFetch(`${this.config.baseUrl}/loan-exceptions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error(await this.message(response, 'No fue posible registrar la solicitud de excepción.'));
    return (await response.json()) as LoanExceptionItem;
  }

  async cancel(id: string): Promise<LoanExceptionItem> {
    const response = await this.auth.authorizedFetch(`${this.config.baseUrl}/loan-exceptions/${id}/cancel`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error(await this.message(response, 'No fue posible cancelar la solicitud de excepción.'));
    return (await response.json()) as LoanExceptionItem;
  }

  private async message(response: Response, fallback: string): Promise<string> {
    if (response.status === 403) return 'No tienes autorización para esta solicitud o cliente.';
    if (response.status === 404) return 'No se encontró la solicitud o el cliente seleccionado.';
    if (response.status === 409) {
      const detail = await response.json().catch(() => null) as { message?: string } | null;
      return detail?.message ?? 'Conflicto con el estado actual de la solicitud.';
    }
    const detail = await response.json().catch(() => null) as { message?: string } | null;
    return detail?.message ?? fallback;
  }
}
