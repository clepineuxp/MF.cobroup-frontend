import { Component, effect, inject, signal } from '@angular/core';
import { AuthService, OrganizationOption } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-organization-switcher',
  templateUrl: './organization-switcher.component.html',
  styleUrl: './organization-switcher.component.scss',
})
export class OrganizationSwitcherComponent {
  private readonly auth = inject(AuthService);
  readonly context = this.auth.context;
  readonly organizations = signal<readonly OrganizationOption[]>([]);
  readonly busy = signal(false);
  readonly error = signal('');

  constructor() {
    effect(() => {
      const context = this.context();
      if (context) void this.loadOrganizations();
      else this.organizations.set([]);
    });
  }

  async select(event: Event): Promise<void> {
    const organizationId = (event.target as HTMLSelectElement).value;
    if (!organizationId || organizationId === this.context()?.organizationId) return;
    this.busy.set(true); this.error.set('');
    try { await this.auth.selectOrganization(organizationId); }
    catch (error) { this.error.set(error instanceof Error ? error.message : 'No fue posible cambiar de organización.'); this.busy.set(false); }
  }

  private async loadOrganizations(): Promise<void> {
    try { this.organizations.set(await this.auth.listOrganizations()); }
    catch { this.error.set('No fue posible consultar tus organizaciones.'); }
  }
}
