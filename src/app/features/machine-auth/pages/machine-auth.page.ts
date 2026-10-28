import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { RoutesService } from '../../routes/data/routes.service';
import { AccessibleRoute } from '../../routes/data/route.models';
import { MachineAuthService } from '../data/machine-auth.service';

@Component({ selector: 'app-machine-auth-page', standalone: true, template: `
<section aria-labelledby="machine-auth-title"><h2 id="machine-auth-title">Autoriza este dispositivo</h2>
<p>Por seguridad, cada celular o computador debe ser autorizado para una ruta.</p>
@if (error()) { <p role="alert">{{ error() }}</p> }
@if (otp()) { <p role="status">Entrega este código al administrador: <strong>{{ otp() }}</strong><br/>Válido hasta {{ expiresAt() }}</p> }
<label>Ruta <select [value]="selected()" (change)="choose($any($event.target).value)"><option value="">Selecciona una ruta</option>@for (route of routes(); track route.id) { <option [value]="route.id">{{ route.name }}</option> }</select></label>
<div><button type="button" (click)="request()" [disabled]="!selected() || busy()">Validar autorización</button><button type="button" (click)="logout()">Cerrar sesión</button></div>
@if (routes().length > 1) { <p>Puedes cambiar de ruta usando el selector.</p> }
</section>` })
export class MachineAuthPage {
  private readonly auth = inject(AuthService); private readonly routesService = inject(RoutesService); private readonly machine = inject(MachineAuthService); private readonly router = inject(Router);
  readonly routes = signal<readonly AccessibleRoute[]>([]); readonly selected = signal(this.auth.selectedRouteId() ?? ''); readonly busy = signal(false); readonly error = signal(''); readonly otp = signal(''); readonly expiresAt = signal('');
  constructor() { void this.load(); }
  private async load(): Promise<void> { try { const routes = await this.routesService.listAccessible(); this.routes.set(routes); if (!this.selected() && routes.length === 1) this.choose(routes[0].id); if (this.selected() && await this.machine.check(this.selected())) await this.router.navigateByUrl('/'); } catch (e) { this.error.set(e instanceof Error ? e.message : 'No fue posible consultar las rutas.'); } }
  choose(routeId: string): void { this.selected.set(routeId); if (routeId) this.auth.selectRoute(routeId); this.otp.set(''); }
  async request(): Promise<void> { if (!this.selected()) return; this.busy.set(true); this.error.set(''); try { if (this.otp() && await this.machine.check(this.selected())) { await this.router.navigateByUrl('/'); return; } if (this.otp()) { this.error.set('La autorización aún está pendiente de aprobación.'); return; } const result = await this.machine.requestOtp(this.selected()); this.otp.set(result.otp); this.expiresAt.set(new Date(result.expiresAtUtc).toLocaleString()); } catch (e) { this.error.set(e instanceof Error ? e.message : 'No fue posible generar o validar el OTP.'); } finally { this.busy.set(false); } }
  async logout(): Promise<void> { await this.auth.logout(); }
}
