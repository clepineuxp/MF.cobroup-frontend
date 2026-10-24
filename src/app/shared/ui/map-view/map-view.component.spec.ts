import { TestBed } from '@angular/core/testing';
import { MapViewComponent } from './map-view.component';

describe('MapViewComponent geolocation', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('centers the map state on the current browser location', () => {
    let resolveLocation: PositionCallback = () => undefined;
    vi.stubGlobal('navigator', {
      geolocation: { getCurrentPosition: vi.fn((success: PositionCallback) => { resolveLocation = success; }) },
    });
    const component = TestBed.runInInjectionContext(() => new MapViewComponent());

    component.goToCurrentLocation();
    expect(component.locatingUser()).toBe(true);
    resolveLocation({ coords: { latitude: 4.6583, longitude: -74.0937 } } as GeolocationPosition);

    expect(component.centerLat()).toBe(4.6583);
    expect(component.centerLon()).toBe(-74.0937);
    expect(component.zoomLevel()).toBe(17);
    expect(component.locatingUser()).toBe(false);
  });

  it('explains when location permission is denied', () => {
    let rejectLocation: PositionErrorCallback = () => undefined;
    vi.stubGlobal('navigator', {
      geolocation: { getCurrentPosition: vi.fn((_success: PositionCallback, error: PositionErrorCallback) => { rejectLocation = error; }) },
    });
    const component = TestBed.runInInjectionContext(() => new MapViewComponent());

    component.goToCurrentLocation();
    rejectLocation({ code: 1 } as GeolocationPositionError);

    expect(component.locationError()).toContain('Permite el acceso');
    expect(component.locatingUser()).toBe(false);
  });
});
