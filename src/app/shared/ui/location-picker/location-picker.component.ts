import { AfterViewInit, Component, ElementRef, EventEmitter, InjectionToken, Input, OnDestroy, Output, ViewChild, computed, effect, inject, signal } from '@angular/core';
import type { Map, Marker, TileLayer, LeafletMouseEvent } from 'leaflet';
import { MapLayerMode, MapLayerModeService } from '../map-view/map-layer-mode.service';

export interface SelectedCoordinates { latitude: number; longitude: number; }
export const LEAFLET_LOADER = new InjectionToken<() => Promise<typeof import('leaflet')>>('Leaflet loader', {
  providedIn: 'root', factory: () => () => import('leaflet'),
});

@Component({
  selector: 'app-location-picker',
  templateUrl: './location-picker.component.html',
  styleUrl: './location-picker.component.scss',
})
export class LocationPickerComponent implements AfterViewInit, OnDestroy {
  @Input() initial: SelectedCoordinates | null = null;
  @Output() readonly confirmed = new EventEmitter<SelectedCoordinates>();
  @Output() readonly closed = new EventEmitter<void>();
  @ViewChild('dialog', { static: true }) dialog!: ElementRef<HTMLDialogElement>;
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef<HTMLDivElement>;
  readonly loading = signal(true);
  readonly error = signal('');
  readonly selected = signal<SelectedCoordinates | null>(null);
  private readonly layerModeService = inject(MapLayerModeService);
  readonly isSatelliteMode = this.layerModeService.isSatelliteMode;
  readonly activeLayerMode = this.layerModeService.activeLayerMode;
  readonly layerModeIcon = computed(() => this.isSatelliteMode() ? '🗺️' : '🛰️');
  readonly layerModeLabel = computed(() => this.isSatelliteMode()
    ? 'Volver al mapa del tema de la aplicación'
    : 'Cambiar a vista satelital');
  private map: Map | null = null;
  private readonly loadLeaflet = inject(LEAFLET_LOADER);
  private leaflet: typeof import('leaflet') | null = null;
  private marker: Marker | null = null;
  private tileLayers: TileLayer[] = [];
  private disposed = false;
  private loadTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => this.setLayerMode(this.activeLayerMode()));
  }

  async ngAfterViewInit(): Promise<void> {
    this.dialog.nativeElement.showModal();
    try {
      const leaflet = await this.loadLeaflet();
      const L = (leaflet as { default?: typeof import('leaflet') }).default ?? leaflet;
      if (this.disposed) return;
      this.leaflet = L;
      const initial = this.initial;
      const center: [number, number] = initial ? [initial.latitude, initial.longitude] : [4.5709, -74.2973];
      this.map = L.map(this.mapContainer.nativeElement, { center, zoom: initial ? 16 : 6 });
      this.setLayerMode(this.activeLayerMode());
      const pin = L.divIcon({
        className: 'location-picker-pin',
        html: `<span class="user-location-marker" aria-hidden="true">
          <span class="user-marker-halo"></span>
          <span class="user-marker-face">
            <svg viewBox="0 0 24 24" focusable="false"><circle cx="12" cy="8" r="4"></circle><path d="M4.8 20c.8-4.1 3.2-6.2 7.2-6.2s6.4 2.1 7.2 6.2"></path></svg>
          </span>
          <span class="user-marker-arrow"></span>
        </span>`,
        iconSize: [54, 66],
        iconAnchor: [27, 64],
      });
      const choose = (latitude: number, longitude: number) => {
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
        const coordinates = { latitude: Number(Math.max(-90, Math.min(90, latitude)).toFixed(6)), longitude: Number((((longitude + 180) % 360 + 360) % 360 - 180).toFixed(6)) };
        this.selected.set(coordinates);
        if (!this.marker) {
          this.marker = L.marker([coordinates.latitude, coordinates.longitude], { draggable: true, icon: pin, autoPan: true, title: 'Ubicación seleccionada: arrastra para mover' }).addTo(this.map!);
          this.marker.on('dragend', () => { const point = this.marker!.getLatLng(); choose(point.lat, point.lng); });
        } else this.marker.setLatLng([coordinates.latitude, coordinates.longitude]);
      };
      this.map.on('click', (event: LeafletMouseEvent) => choose(event.latlng.lat, event.latlng.lng));
      if (initial) choose(initial.latitude, initial.longitude);
      this.map.invalidateSize();
    } catch {
      if (!this.disposed) { this.loading.set(false); this.error.set('No fue posible abrir el mapa. Cierra e intenta nuevamente.'); }
    }
  }

  confirm(): void {
    const coordinates = this.selected();
    if (coordinates && !this.loading() && !this.error()) this.confirmed.emit(coordinates);
  }

  retry(): void {
    if (this.tileLayers.length === 0) return;
    this.error.set(''); this.loading.set(true);
    this.tileLayers.forEach((layer) => layer.redraw());
    this.startTimeout();
  }

  toggleSatelliteMode(): void { this.layerModeService.toggleSatelliteMode(); }

  private setLayerMode(mode: MapLayerMode): void {
    if (!this.map || !this.leaflet) return;
    this.tileLayers.forEach((layer) => this.map?.removeLayer(layer));
    this.tileLayers = [];
    this.error.set(''); this.loading.set(true);

    const definitions = mode === 'satellite'
      ? [
          ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', '&copy; Esri — Satellite', 19],
          ['https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}', '', 19],
        ] as const
      : mode === 'dark'
        ? [
            ['https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', '&copy; Esri — Dark Gray Canvas', 16],
            ['https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}', '', 16],
          ] as const
        : [
            ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', '&copy; Esri — World Street Map', 19],
          ] as const;

    definitions.forEach(([url, attribution, maxZoom], index) => {
      const layer = this.leaflet!.tileLayer(url, { maxZoom, attribution });
      if (index === 0) {
        layer.on('loading', () => this.loading.set(true));
        layer.on('load', () => { this.loading.set(false); this.clearTimeout(); });
        layer.on('tileerror', () => {
          this.loading.set(false);
          this.error.set('No se pudo cargar el mapa. Revisa la conexión y pulsa Reintentar.');
          this.clearTimeout();
        });
      }
      layer.addTo(this.map!);
      this.tileLayers.push(layer);
    });
    this.tileLayers[0]?.bringToBack();
    this.startTimeout();
  }

  cancel(event?: Event): void { event?.preventDefault(); this.closed.emit(); }
  private clearTimeout(): void { if (this.loadTimeout !== null) clearTimeout(this.loadTimeout); this.loadTimeout = null; }
  private startTimeout(): void {
    this.clearTimeout();
    this.loadTimeout = setTimeout(() => { this.loading.set(false); this.error.set('El mapa tardó demasiado en responder. Pulsa Reintentar.'); }, 15000);
  }
  ngOnDestroy(): void {
    this.disposed = true; this.clearTimeout(); this.map?.remove(); this.map = null; this.leaflet = null;
    this.dialog.nativeElement.close();
  }
}
