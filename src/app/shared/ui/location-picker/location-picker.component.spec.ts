import { TestBed } from '@angular/core/testing';
import { ThemeService } from '../../../themes/theme.service';
import { MapLayerModeService } from '../map-view/map-layer-mode.service';
import { LEAFLET_LOADER, LocationPickerComponent } from './location-picker.component';

const mocks = { mapEvents: new Map<string, (event?: unknown) => void>(), markerEvents: new Map<string, () => void>(), tileEvents: new Map<string, () => void>(), remove: vi.fn() };
const leaflet = {
  map: vi.fn(() => ({ on: (event: string, handler: (event?: unknown) => void) => mocks.mapEvents.set(event, handler), invalidateSize: vi.fn(), removeLayer: vi.fn(), remove: mocks.remove })),
  tileLayer: vi.fn(() => { const tile = { on: (event: string, handler: () => void) => { mocks.tileEvents.set(event, handler); return tile; }, addTo: vi.fn(), redraw: vi.fn(), bringToBack: vi.fn() }; return tile; }),
  divIcon: vi.fn(),
  marker: vi.fn(() => { const marker = { addTo: () => marker, on: (event: string, handler: () => void) => mocks.markerEvents.set(event, handler), setLatLng: vi.fn(), getLatLng: () => ({ lat: 4.7, lng: -74.1 }) }; return marker; }),
};

describe('LocationPickerComponent', () => {
  beforeEach(async () => {
    mocks.mapEvents.clear(); mocks.markerEvents.clear(); mocks.tileEvents.clear(); vi.clearAllMocks();
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: vi.fn() });
    Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: vi.fn() });
    await TestBed.configureTestingModule({ imports: [LocationPickerComponent], providers: [{ provide: LEAFLET_LOADER, useValue: () => Promise.resolve(leaflet) }] }).compileComponents();
  });
  afterEach(() => vi.restoreAllMocks());

  it('selects by clicking the map and emits only after confirming', async () => {
    const fixture = TestBed.createComponent(LocationPickerComponent); fixture.detectChanges(); await fixture.whenStable();
    await vi.waitFor(() => expect(mocks.mapEvents.has('click')).toBe(true));
    const component = fixture.componentInstance; const selected = vi.fn(); component.confirmed.subscribe(selected);
    mocks.tileEvents.get('load')?.();
    mocks.mapEvents.get('click')?.({ latlng: { lat: 4.7, lng: -74.1 } });
    expect(component.selected()?.latitude).toBe(4.7); expect(selected).not.toHaveBeenCalled();
    component.confirm(); expect(selected).toHaveBeenCalledWith(expect.objectContaining({ latitude: 4.7, longitude: -74.1 }));
    fixture.destroy(); expect(mocks.remove).toHaveBeenCalledOnce();
  });

  it('does not confirm while tiles are loading or after a map error', async () => {
    const fixture = TestBed.createComponent(LocationPickerComponent); fixture.componentInstance.initial = { latitude: 4.7, longitude: -74.1 };
    fixture.detectChanges(); await fixture.whenStable();
    await vi.waitFor(() => expect(mocks.mapEvents.has('click')).toBe(true));
    const selected = vi.fn(); fixture.componentInstance.confirmed.subscribe(selected);
    fixture.componentInstance.confirm(); expect(selected).not.toHaveBeenCalled();
    mocks.tileEvents.get('tileerror')?.(); fixture.componentInstance.confirm();
    expect(selected).not.toHaveBeenCalled(); expect(fixture.componentInstance.error()).toContain('conexión');
  });

  it('cancels without emitting coordinates', async () => {
    const fixture = TestBed.createComponent(LocationPickerComponent); fixture.detectChanges(); await fixture.whenStable();
    const closed = vi.fn(); const selected = vi.fn(); fixture.componentInstance.closed.subscribe(closed); fixture.componentInstance.confirmed.subscribe(selected);
    fixture.componentInstance.cancel(); expect(closed).toHaveBeenCalledOnce(); expect(selected).not.toHaveBeenCalled();
  });

  it('updates the provisional point when the pin is dragged', async () => {
    const fixture = TestBed.createComponent(LocationPickerComponent); fixture.componentInstance.initial = { latitude: 4, longitude: -74 };
    fixture.detectChanges(); await fixture.whenStable(); await vi.waitFor(() => expect(mocks.markerEvents.has('dragend')).toBe(true));
    mocks.tileEvents.get('load')?.(); mocks.markerEvents.get('dragend')?.();
    expect(fixture.componentInstance.selected()).toEqual({ latitude: 4.7, longitude: -74.1 });
  });

  it('inherits dark and satellite layers and renders the customer marker', async () => {
    TestBed.inject(ThemeService).setTheme('dark');
    const fixture = TestBed.createComponent(LocationPickerComponent); fixture.detectChanges(); await fixture.whenStable();
    await vi.waitFor(() => expect(leaflet.tileLayer).toHaveBeenCalledWith(expect.stringContaining('World_Dark_Gray_Base'), expect.anything()));
    TestBed.inject(MapLayerModeService).toggleSatelliteMode();
    await vi.waitFor(() => expect(leaflet.tileLayer).toHaveBeenCalledWith(expect.stringContaining('World_Imagery'), expect.anything()));
    mocks.mapEvents.get('click')?.({ latlng: { lat: 4.7, lng: -74.1 } });
    expect(leaflet.divIcon).toHaveBeenCalledWith(expect.objectContaining({ html: expect.stringContaining('user-location-marker') }));
  });
});
