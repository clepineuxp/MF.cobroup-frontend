import { Injectable, inject } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { API_CONFIG } from '../../../core/config/api.config';
import { CustomerDetails, CustomerPage, CustomerWriteRequest } from './customer.models';

@Injectable({ providedIn: 'root' })
export class CustomersService {
  private readonly auth = inject(AuthService);
  private readonly config = inject(API_CONFIG);

  async search(routeId: string, search: string, page = 1, pageSize = 25): Promise<CustomerPage> {
    const query = new URLSearchParams({ page: page.toString(), pageSize: pageSize.toString() });
    if (routeId) query.set('routeId', routeId);
    if (search.trim()) query.set('search', search.trim());
    const response = await this.auth.authorizedFetch(`${this.config.baseUrl}/customers?${query}`);
    if (!response.ok) throw new Error(await this.message(response, 'No fue posible consultar los clientes.'));
    return (await response.json()) as CustomerPage;
  }

  async get(customerId: string): Promise<CustomerDetails> {
    const response = await this.auth.authorizedFetch(`${this.config.baseUrl}/customers/${customerId}`);
    if (!response.ok) throw new Error(await this.message(response, 'No fue posible consultar el cliente.'));
    return (await response.json()) as CustomerDetails;
  }

  async create(request: CustomerWriteRequest): Promise<CustomerDetails> {
    const response = await this.auth.authorizedFetch(`${this.config.baseUrl}/customers`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error(await this.message(response, 'No fue posible crear el cliente.'));
    return (await response.json()) as CustomerDetails;
  }

  async update(customerId: string, request: CustomerWriteRequest): Promise<CustomerDetails> {
    const response = await this.auth.authorizedFetch(`${this.config.baseUrl}/customers/${customerId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error(await this.message(response, 'No fue posible actualizar el cliente.'));
    return (await response.json()) as CustomerDetails;
  }

  private async message(response: Response, fallback: string): Promise<string> {
    if (response.status === 403) return 'No tienes permiso para realizar esta operación.';
    if (response.status === 409) {
      const detail = await response.json().catch(() => null) as { message?: string } | null;
      return detail?.message ?? 'La ruta no tiene cupo disponible para otro cliente activo.';
    }
    if (response.status === 503) return 'La validación de rutas no está disponible temporalmente.';
    const detail = await response.json().catch(() => null) as { message?: string } | null;
    return detail?.message ?? fallback;
  }
}
