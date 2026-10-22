import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-auth-callback-page',
  imports: [RouterLink],
  template: `<section aria-live="polite"><h2>Validando acceso</h2>@if (error()) { <p>{{ error() }}</p><a routerLink="/login">Volver al ingreso</a> } @else { <p>Estamos comprobando tu sesión segura…</p> }</section>`
})
export class AuthCallbackPage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly error = signal('');

  async ngOnInit(): Promise<void> {
    try {
      if (this.auth.isAuthenticated()) {
        await this.router.navigateByUrl('/');
        return;
      }
      const restored = await this.auth.refreshAccessToken();
      if (restored) {
        await this.router.navigateByUrl('/');
      } else {
        await this.router.navigateByUrl('/login');
      }
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No fue posible validar el acceso.');
    }
  }
}
