import { Injectable, inject } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { API_CONFIG } from '../../../core/config/api.config';
import { AvailableLoanTemplate } from './loan-template.models';

@Injectable({ providedIn: 'root' })
export class LoanTemplatesService {
  private readonly auth = inject(AuthService);
  private readonly config = inject(API_CONFIG);

  async listAvailable(): Promise<readonly AvailableLoanTemplate[]> {
    const response = await this.auth.authorizedFetch(`${this.config.baseUrl}/loan-templates`);
    if (!response.ok) {
      throw new Error(response.status === 503
        ? 'El catálogo de plantillas no está disponible temporalmente.'
        : 'No fue posible consultar las plantillas disponibles.');
    }
    return (await response.json()) as AvailableLoanTemplate[];
  }
}
