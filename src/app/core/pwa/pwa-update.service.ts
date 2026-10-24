import { DOCUMENT } from '@angular/common';
import { ApplicationRef, DestroyRef, Injectable, InjectionToken, NgZone, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SwUpdate } from '@angular/service-worker';
import { filter, take } from 'rxjs';

export const PWA_RELOAD = new InjectionToken<() => void>('PWA_RELOAD', {
  providedIn: 'root', factory: () => { const document = inject(DOCUMENT); return () => document.defaultView?.location.reload(); }
});

@Injectable({ providedIn: 'root' })
export class PwaUpdateService {
  private readonly sw = inject(SwUpdate, { optional: true });
  private readonly reload = inject(PWA_RELOAD);
  private readonly document = inject(DOCUMENT);
  private readonly destroy = inject(DestroyRef);
  readonly enabled = !!this.sw?.isEnabled;
  readonly updateAvailable = signal(false);
  readonly promptOpen = signal(false);
  readonly updating = signal(false);
  readonly checking = signal(false);
  readonly message = signal('');
  readonly error = signal('');
  private readyHash = '';
  private lastCheck = 0;

  constructor() {
    if (!this.enabled) return;
    this.sw!.versionUpdates.pipe(takeUntilDestroyed()).subscribe(event => {
      if (event.type === 'VERSION_READY' && event.latestVersion.hash !== this.readyHash) {
        this.readyHash = event.latestVersion.hash;
        this.updateAvailable.set(true);
        this.error.set('');
        this.promptOpen.set(true);
      }
    });
    const zone = inject(NgZone);
    inject(ApplicationRef).isStable.pipe(filter(Boolean), take(1), takeUntilDestroyed()).subscribe(() => {
      zone.runOutsideAngular(() => {
        const check = () => { if (this.document.visibilityState !== 'hidden') void this.checkForUpdate(); };
        const timer = setInterval(check, 15 * 60_000);
        const window = this.document.defaultView;
        window?.addEventListener('focus', check);
        window?.addEventListener('online', check);
        this.document.addEventListener('visibilitychange', check);
        this.destroy.onDestroy(() => {
          clearInterval(timer);
          window?.removeEventListener('focus', check);
          window?.removeEventListener('online', check);
          this.document.removeEventListener('visibilitychange', check);
        });
        check();
      });
    });
  }

  async checkForUpdate(manual = false): Promise<void> {
    if (!this.enabled || this.checking() || (!manual && Date.now() - this.lastCheck < 60_000)) return;
    if (this.updateAvailable()) { if (manual) this.openPrompt(); return; }
    this.lastCheck = Date.now();
    this.checking.set(true);
    this.message.set('');
    this.error.set('');
    try {
      const found = await this.sw!.checkForUpdate();
      if (manual && !found) this.message.set('Ya tienes la versión más reciente.');
    } catch {
      if (manual) this.message.set('No se pudo buscar la actualización. Revisa tu conexión e intenta de nuevo.');
    } finally { this.checking.set(false); }
  }

  openPrompt(): void { if (this.updateAvailable()) this.promptOpen.set(true); }
  defer(): void { if (!this.updating()) this.promptOpen.set(false); }
  activateUpdate(): void {
    if (!this.enabled || !this.updateAvailable() || this.updating()) return;
    this.updating.set(true);
    this.error.set('');
    // Reload lets the worker switch the entire application atomically, including lazy chunks.
    try { this.reload(); }
    catch { this.updating.set(false); this.error.set('No se pudo actualizar. Intenta de nuevo.'); }
  }
}
