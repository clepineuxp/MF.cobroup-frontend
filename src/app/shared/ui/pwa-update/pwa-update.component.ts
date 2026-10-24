import { AfterViewInit, Component, ElementRef, effect, inject, signal, viewChild } from '@angular/core';
import { PwaUpdateService } from '../../../core/pwa/pwa-update.service';

@Component({
  selector: 'app-pwa-update',
  template: `
    <dialog #dialog aria-labelledby="pwa-title" aria-describedby="pwa-description" (cancel)="cancel($event)">
      <div class="update-icon" aria-hidden="true">↻</div>
      <p class="eyebrow">COBRO UP · ACTUALIZACIÓN</p>
      <h2 id="pwa-title">Hay una nueva versión</h2>
      <p id="pwa-description">La actualización está lista. Guarda los cambios pendientes antes de continuar; la aplicación se reiniciará.</p>
      @if (pwa.error()) { <p role="alert">{{ pwa.error() }}</p> }
      <div class="actions">
        <button type="button" (click)="pwa.defer()" [disabled]="pwa.updating()">Más tarde</button>
        <button type="button" class="primary" (click)="pwa.activateUpdate()" [disabled]="pwa.updating()">{{ pwa.updating() ? 'Actualizando…' : 'Actualizar ahora' }}</button>
      </div>
    </dialog>`,
  styleUrl: './pwa-update.component.scss'
})
export class PwaUpdateComponent implements AfterViewInit {
  readonly pwa = inject(PwaUpdateService);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly ready = signal(false);
  constructor() {
    effect(() => {
      if (!this.ready()) return;
      const dialog = this.dialog().nativeElement;
      if (this.pwa.promptOpen() && !dialog.open) dialog.showModal();
      else if (!this.pwa.promptOpen() && dialog.open) dialog.close();
    });
  }
  ngAfterViewInit(): void { this.ready.set(true); }
  cancel(event: Event): void { event.preventDefault(); this.pwa.defer(); }
}
