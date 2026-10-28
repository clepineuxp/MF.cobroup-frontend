import { Component, computed, inject, OnDestroy, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { RoutesService } from '../../routes/data/routes.service';
import { AccessibleRoute } from '../../routes/data/route.models';
import { MachineAuthService } from '../data/machine-auth.service';

@Component({
  selector: 'app-machine-auth-page',
  standalone: true,
  templateUrl: './machine-auth.page.html',
  styleUrl: './machine-auth.page.scss'
})
export class MachineAuthPage implements OnDestroy {
  private readonly auth = inject(AuthService); private readonly routesService = inject(RoutesService); private readonly machine = inject(MachineAuthService); private readonly router = inject(Router);
  readonly routes = signal<readonly AccessibleRoute[]>([]); readonly selected = signal(this.auth.selectedRouteId() ?? ''); readonly busy = signal(false); readonly error = signal(''); readonly otp = signal(''); readonly otpReused = signal(false); readonly expiresAt = signal(''); readonly remainingSeconds = signal(0); readonly countdownPercent = computed(() => Math.max(0, Math.min(100, Math.round((this.remainingSeconds() / (2 * 60 * 60)) * 100)))); private countdownTimer?: ReturnType<typeof setInterval>;
  constructor() { void this.load(); }
  private async load(): Promise<void> {
    try {
      const routes = await this.routesService.listAccessible();
      this.routes.set(routes);
      const currentRoute = this.selected() && routes.some((route) => route.id === this.selected()) ? this.selected() : '';
      if (currentRoute && await this.machine.check(currentRoute)) {
        await this.router.navigateByUrl('/');
        return;
      }
      if (currentRoute) {
        await this.choose(currentRoute);
      } else if (routes.length === 1) {
        await this.choose(routes[0].id);
      }
    } catch (e) { this.error.set(e instanceof Error ? e.message : 'No fue posible consultar las rutas.'); }
  }
  async choose(routeId: string): Promise<void> {
    this.selected.set(routeId);
    this.otp.set('');
    this.otpReused.set(false);
    this.expiresAt.set('');
    this.error.set('');
    if (routeId) {
      this.auth.selectRoute(routeId);
      await this.request();
    }
  }
  async request(): Promise<void> { if (!this.selected()) return; this.busy.set(true); this.error.set(''); try { if (await this.machine.check(this.selected())) { await this.router.navigateByUrl('/'); return; } if (this.otp() || this.otpReused()) { this.error.set('La autorización aún está pendiente de aprobación.'); return; } await this.loadOtp(false); } catch (e) { this.error.set(e instanceof Error ? e.message : 'No fue posible generar o validar el OTP.'); } finally { this.busy.set(false); } }
  async regenerate(): Promise<void> { if (!this.selected() || this.busy()) return; this.busy.set(true); this.error.set(''); try { await this.loadOtp(true); } catch (e) { this.error.set(e instanceof Error ? e.message : 'No fue posible regenerar el OTP.'); } finally { this.busy.set(false); } }
  private async loadOtp(regenerate: boolean): Promise<void> { const result = await this.machine.requestOtp(this.selected(), regenerate); this.otp.set(result.otp ?? ''); this.otpReused.set(result.reused); this.startCountdown(result.createdAtUtc, result.expiresAtUtc); }
  private startCountdown(createdAtUtc: string, expiresAtUtc: string): void { if (this.countdownTimer) clearInterval(this.countdownTimer); this.expiresAt.set(new Date(expiresAtUtc).toLocaleString()); const update = () => { const remaining = Math.max(0, Math.ceil((Date.parse(expiresAtUtc) - Date.now()) / 1000)); this.remainingSeconds.set(remaining); if (remaining === 0 && this.countdownTimer) { clearInterval(this.countdownTimer); this.countdownTimer = undefined; } }; void createdAtUtc; update(); this.countdownTimer = setInterval(update, 1000); }
  countdownLabel(): string { const total = this.remainingSeconds(); const hours = Math.floor(total / 3600); const minutes = Math.floor((total % 3600) / 60); const seconds = total % 60; return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`; }
  ngOnDestroy(): void { if (this.countdownTimer) clearInterval(this.countdownTimer); }
  async logout(): Promise<void> { await this.auth.logout(); }
}
