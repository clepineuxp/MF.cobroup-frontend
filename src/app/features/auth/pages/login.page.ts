import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';

@Component({ selector: 'app-login-page', imports: [ReactiveFormsModule], templateUrl: './login.page.html', styleUrl: './login.page.scss' })
export class LoginPage {
  private readonly auth = inject(AuthService); readonly busy = signal(false); readonly error = signal('');
  readonly membershipRequired = signal(false);
  readonly form = new FormGroup({ username: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }) });
  async submit(): Promise<void> {
    if (this.form.invalid || this.busy()) return; this.busy.set(true); this.error.set(''); this.membershipRequired.set(false);
    try {
      const outcome = await this.auth.login(this.form.getRawValue());
      this.membershipRequired.set(outcome === 'membership_required');
      if (outcome === 'membership_required') this.busy.set(false);
    }
    catch (error) { this.error.set(error instanceof Error ? error.message : 'No fue posible iniciar sesión.'); this.busy.set(false); }
  }
  async continueSession(): Promise<void> {
    this.busy.set(true);
    const restored = await this.auth.refreshAccessToken();
    if (restored) return;
    this.error.set('No hay una sesión previa activa para restaurar.');
    this.busy.set(false);
  }
}
