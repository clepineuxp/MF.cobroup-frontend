import { Injectable, inject } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { API_CONFIG } from '../../../core/config/api.config';
import { AccessibleRoute } from './route.models';

@Injectable({ providedIn: 'root' })
export class RoutesService {
  private readonly auth = inject(AuthService);
  private readonly config = inject(API_CONFIG);

  async listAccessible(): Promise<readonly AccessibleRoute[]> {
    const response = await this.auth.authorizedFetch(`${this.config.baseUrl}/routes`);
    if (!response.ok) {
      throw new Error(response.status === 503
        ? 'El directorio de rutas no está disponible temporalmente.'
        : 'No fue posible consultar tus rutas.');
    }
    return (await response.json()) as AccessibleRoute[];
  }
}
