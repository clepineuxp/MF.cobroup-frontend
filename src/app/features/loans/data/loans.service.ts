import { Injectable, inject } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { API_CONFIG } from '../../../core/config/api.config';
import {
  CalculatedSchedule,
  LoanDetails,
  LoanSearchResponse,
  OriginateLoanRequest,
  PreviewLoanScheduleRequest,
} from './loan.models';

@Injectable({ providedIn: 'root' })
export class LoansService {
  private readonly auth = inject(AuthService);
  private readonly config = inject(API_CONFIG);

  async search(
    routeId?: string,
    customerId?: string,
    status?: string,
    page = 1,
    pageSize = 25
  ): Promise<LoanSearchResponse> {
    const query = new URLSearchParams({ page: page.toString(), pageSize: pageSize.toString() });
    if (routeId) query.set('routeId', routeId);
    if (customerId) query.set('customerId', customerId);
    if (status) query.set('status', status);

    const response = await this.auth.authorizedFetch(`${this.config.baseUrl}/loans?${query}`);
    if (!response.ok) throw new Error(await this.message(response, 'No fue posible consultar los préstamos.'));
    return (await response.json()) as LoanSearchResponse;
  }

  async get(id: string): Promise<LoanDetails> {
    const response = await this.auth.authorizedFetch(`${this.config.baseUrl}/loans/${id}`);
    if (!response.ok) throw new Error(await this.message(response, 'No fue posible consultar el préstamo.'));
    return (await response.json()) as LoanDetails;
  }

  async listByCustomer(customerId: string): Promise<readonly LoanDetails[]> {
    const response = await this.auth.authorizedFetch(`${this.config.baseUrl}/loans/by-customer/${customerId}`);
    if (!response.ok) throw new Error(await this.message(response, 'No fue posible consultar préstamos del cliente.'));
    return (await response.json()) as readonly LoanDetails[];
  }

  async previewSchedule(request: PreviewLoanScheduleRequest): Promise<CalculatedSchedule> {
    const response = await this.auth.authorizedFetch(`${this.config.baseUrl}/loans/preview-schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error(await this.message(response, 'No fue posible previsualizar el cronograma.'));
    return (await response.json()) as CalculatedSchedule;
  }

  async originate(request: OriginateLoanRequest): Promise<LoanDetails> {
    const response = await this.auth.authorizedFetch(`${this.config.baseUrl}/loans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error(await this.message(response, 'No fue posible originar el préstamo.'));
    return (await response.json()) as LoanDetails;
  }

  async update(id: string, request: OriginateLoanRequest): Promise<LoanDetails> {
    const response = await this.auth.authorizedFetch(`${this.config.baseUrl}/loans/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error(await this.message(response, 'No fue posible actualizar el préstamo.'));
    return (await response.json()) as LoanDetails;
  }

  async delete(id: string): Promise<void> {
    const response = await this.auth.authorizedFetch(`${this.config.baseUrl}/loans/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error(await this.message(response, 'No fue posible eliminar el préstamo.'));
  }

  private async message(response: Response, fallback: string): Promise<string> {
    if (response.status === 403) return 'No tienes autorización para esta ruta o cliente.';
    if (response.status === 404) return 'No se encontró el préstamo o cliente seleccionado.';
    if (response.status === 409) {
      const detail = (await response.json().catch(() => null)) as { message?: string } | null;
      return detail?.message ?? 'El cupo de préstamos activos para esta ruta ha sido alcanzado.';
    }
    const detail = (await response.json().catch(() => null)) as { message?: string } | null;
    return detail?.message ?? fallback;
  }
}
