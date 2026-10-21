import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
@Component({ selector: 'app-auth-callback-page', imports: [RouterLink], template: `<section aria-live="polite"><h2>Validando acceso</h2>@if (error()) { <p>{{ error() }}</p><a routerLink="/login">Volver al ingreso</a> } @else { <p>Estamos comprobando tu sesión segura…</p> }</section>` })
export class AuthCallbackPage implements OnInit {
  private readonly auth = inject(AuthService); readonly error = signal('');
  async ngOnInit(): Promise<void> { try { await this.auth.completeAuthorization(window.location.href); } catch (error) { this.error.set(error instanceof Error ? error.message : 'No fue posible validar el acceso.'); } }
}
