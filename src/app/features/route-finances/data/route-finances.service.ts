import { Injectable, inject } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { API_CONFIG } from '../../../core/config/api.config';
import {
  RouteBalance,
  RouteDayClosingStatus,
  RouteFinanceSection,
  RouteFinancialEntry,
  SaveRouteFinancialEntryRequest,
} from './route-finance.models';

@Injectable({ providedIn: 'root' })
export class RouteFinancesService {
  private readonly auth = inject(AuthService);
  private readonly config = inject(API_CONFIG);
  private readonly baseUrl = `${this.config.baseUrl}/route-finances`;

  async getBalance(routeId: string): Promise<RouteBalance> {
    return this.read<RouteBalance>(`${this.baseUrl}/${routeId}/balance`, 'No fue posible consultar el balance de la ruta.');
  }

  async listEntries(routeId: string, section: RouteFinanceSection): Promise<readonly RouteFinancialEntry[]> {
    return this.read<readonly RouteFinancialEntry[]>(
      `${this.baseUrl}/entries?routeId=${encodeURIComponent(routeId)}&section=${section}`,
      'No fue posible consultar los movimientos de la ruta.');
  }

  async create(request: SaveRouteFinancialEntryRequest): Promise<RouteFinancialEntry> {
    return this.write(`${this.baseUrl}/entries`, 'POST', request);
  }

  async update(entryId: string, request: SaveRouteFinancialEntryRequest): Promise<RouteFinancialEntry> {
    return this.write(`${this.baseUrl}/entries/${entryId}`, 'PUT', request);
  }

  async deleteEntry(entryId: string): Promise<void> {
    const response = await this.auth.authorizedFetch(`${this.baseUrl}/entries/${entryId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const problem = await response.json().catch(() => null) as { message?: string } | null;
      throw new Error(problem?.message ?? 'No fue posible eliminar el movimiento.');
    }
  }

  async getDayClosingStatus(routeId: string): Promise<RouteDayClosingStatus> {
    return this.read<RouteDayClosingStatus>(
      `${this.baseUrl}/${routeId}/closing-status`,
      'No fue posible consultar el estado del día para la ruta.'
    );
  }

  async closeDay(routeId: string): Promise<RouteDayClosingStatus> {
    const response = await this.auth.authorizedFetch(`${this.baseUrl}/${routeId}/close-day`, {
      method: 'POST',
    });
    if (!response.ok) {
      const problem = await response.json().catch(() => null) as { message?: string } | null;
      throw new Error(problem?.message ?? 'No fue posible cerrar el día para la ruta.');
    }
    return (await response.json()) as RouteDayClosingStatus;
  }

  async reopenDay(routeId: string): Promise<RouteDayClosingStatus> {
    const response = await this.auth.authorizedFetch(`${this.baseUrl}/${routeId}/reopen-day`, {
      method: 'POST',
    });
    if (!response.ok) {
      const problem = await response.json().catch(() => null) as { message?: string } | null;
      throw new Error(problem?.message ?? 'No fue posible reabrir el día para la ruta.');
    }
    return (await response.json()) as RouteDayClosingStatus;
  }

  private async read<T>(url: string, fallback: string): Promise<T> {
    const response = await this.auth.authorizedFetch(url);
    if (!response.ok) throw new Error(response.status === 503 ? 'El servicio financiero no está disponible temporalmente.' : fallback);
    return (await response.json()) as T;
  }

  private async write(url: string, method: string, body: SaveRouteFinancialEntryRequest): Promise<RouteFinancialEntry> {
    const response = await this.auth.authorizedFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (response.ok) return (await response.json()) as RouteFinancialEntry;
    const problem = await response.json().catch(() => null) as { message?: string } | null;
    throw new Error(problem?.message ?? (response.status === 403
      ? 'Este movimiento ya no puede modificarse porque fue creado en un día anterior.'
      : 'No fue posible guardar el movimiento.'));
  }
}
