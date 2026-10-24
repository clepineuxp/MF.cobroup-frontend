import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SwUpdate, VersionEvent } from '@angular/service-worker';
import { Subject } from 'rxjs';
import { PWA_RELOAD, PwaUpdateService } from './pwa-update.service';

describe('PwaUpdateService', () => {
  let events: Subject<VersionEvent>;
  let check: ReturnType<typeof vi.fn>;
  let reload: ReturnType<typeof vi.fn>;
  function setup(enabled = true) {
    events = new Subject(); check = vi.fn().mockResolvedValue(false); reload = vi.fn();
    TestBed.configureTestingModule({ providers: [
      { provide: SwUpdate, useValue: { isEnabled: enabled, versionUpdates: events, checkForUpdate: check } },
      { provide: ApplicationRef, useValue: { isStable: new Subject<boolean>() } },
      { provide: PWA_RELOAD, useValue: reload }
    ] });
    return TestBed.inject(PwaUpdateService);
  }
  function ready(hash = 'new') {
    events.next({ type: 'VERSION_READY', currentVersion: { hash: 'old' }, latestVersion: { hash } });
  }
  it('opens only for a downloaded version, allows deferral and reopens a newer version', () => {
    const service = setup();
    events.next({ type: 'VERSION_DETECTED', version: { hash: 'new' } });
    expect(service.promptOpen()).toBe(false);
    ready(); expect(service.promptOpen()).toBe(true);
    service.defer(); ready(); expect(service.promptOpen()).toBe(false);
    expect(service.updateAvailable()).toBe(true);
    service.openPrompt(); expect(service.promptOpen()).toBe(true);
    service.defer(); ready('newer'); expect(service.promptOpen()).toBe(true);
  });
  it('reloads once only after confirmation and keeps the complete shell together', () => {
    const service = setup(); service.activateUpdate(); expect(reload).not.toHaveBeenCalled();
    ready(); expect(reload).not.toHaveBeenCalled();
    service.activateUpdate(); service.activateUpdate(); service.defer();
    expect(reload).toHaveBeenCalledTimes(1); expect(service.updating()).toBe(true);
    expect(service.promptOpen()).toBe(true);
  });
  it('permits retry after reload failure', () => {
    const service = setup(); ready(); reload.mockImplementationOnce(() => { throw new Error(); });
    service.activateUpdate(); expect(service.error()).toBeTruthy(); expect(service.updating()).toBe(false);
    service.activateUpdate(); expect(reload).toHaveBeenCalledTimes(2);
  });
  it('handles network errors and manual retries without concurrent checks', async () => {
    const service = setup(); check.mockRejectedValueOnce(new Error('offline'));
    const request = service.checkForUpdate(true); void service.checkForUpdate(true);
    await request; expect(check).toHaveBeenCalledTimes(1); expect(service.message()).toContain('conexión');
    expect(service.checking()).toBe(false);
    await service.checkForUpdate(true); expect(service.message()).toContain('más reciente');
  });
  it('does nothing when service workers are disabled', async () => {
    const service = setup(false); await service.checkForUpdate(true); ready(); service.activateUpdate();
    expect(check).not.toHaveBeenCalled(); expect(reload).not.toHaveBeenCalled(); expect(service.promptOpen()).toBe(false);
    expect(service.currentVersion).toBe('1.14.0');
  });
  it('reopens a deferred update from settings without another download', async () => {
    const service = setup(); ready(); service.defer(); await service.checkForUpdate(true);
    expect(service.promptOpen()).toBe(true); expect(check).not.toHaveBeenCalled();
  });
});
