import { Injectable, inject } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { API_CONFIG } from '../../../core/config/api.config';
import {
  AgendaResponse,
  CustomerMapLocation,
  PortfolioAnalytics,
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

  private async message(response: Response, fallback: string): Promise<string> {
    try {
      const data = await response.json();
      return data?.detail ?? data?.title ?? data?.message ?? fallback;
    } catch {
      return fallback;
    }
  }
}
