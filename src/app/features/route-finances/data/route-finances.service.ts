import { Injectable, inject } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { API_CONFIG } from '../../../core/config/api.config';
import { RouteBalance, RouteFinanceSection, RouteFinancialEntry, SaveRouteFinancialEntryRequest } from './route-finance.models';

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
