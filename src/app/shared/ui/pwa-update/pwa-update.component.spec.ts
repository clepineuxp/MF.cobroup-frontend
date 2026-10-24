import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PwaUpdateService } from '../../../core/pwa/pwa-update.service';
import { PwaUpdateComponent } from './pwa-update.component';

describe('PwaUpdateComponent', () => {
  it('opens the native modal, defers on Escape and blocks actions during reload', async () => {
    const show = vi.fn(function(this: HTMLDialogElement) { this.setAttribute('open', ''); });
    const close = vi.fn(function(this: HTMLDialogElement) { this.removeAttribute('open'); });
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: show });
    Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: close });
    const pwa = { promptOpen: signal(false), updating: signal(false), error: signal(''), defer: vi.fn(), activateUpdate: vi.fn() };
    TestBed.configureTestingModule({ imports: [PwaUpdateComponent], providers: [{ provide: PwaUpdateService, useValue: pwa }] });
    const fixture = TestBed.createComponent(PwaUpdateComponent); await fixture.whenStable();
    expect(show).not.toHaveBeenCalled(); pwa.promptOpen.set(true); await fixture.whenStable();
    expect(show).toHaveBeenCalledTimes(1);
    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    const cancel = new Event('cancel', { cancelable: true }); dialog.dispatchEvent(cancel);
    expect(cancel.defaultPrevented).toBe(true); expect(pwa.defer).toHaveBeenCalled();
    pwa.updating.set(true); await fixture.whenStable();
    expect(Array.from(dialog.querySelectorAll('button')).every(b => b.disabled)).toBe(true);
    expect(dialog.textContent).toContain('Actualizando');
    pwa.promptOpen.set(false); await fixture.whenStable(); expect(close).toHaveBeenCalledTimes(1);
  });
});
