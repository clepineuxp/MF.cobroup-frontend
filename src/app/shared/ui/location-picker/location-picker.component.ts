import { AfterViewInit, Component, ElementRef, EventEmitter, InjectionToken, Input, OnDestroy, Output, ViewChild, inject, signal } from '@angular/core';
import type { Map, Marker, TileLayer, LeafletMouseEvent } from 'leaflet';

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
  private map: Map | null = null;
  private readonly loadLeaflet = inject(LEAFLET_LOADER);
  private marker: Marker | null = null;
  private tiles: TileLayer | null = null;
  private disposed = false;
  private loadTimeout: ReturnType<typeof setTimeout> | null = null;

  async ngAfterViewInit(): Promise<void> {
    this.dialog.nativeElement.showModal();
    try {
      const leaflet = await this.loadLeaflet();
      const L = (leaflet as { default?: typeof import('leaflet') }).default ?? leaflet;
      if (this.disposed) return;
      const initial = this.initial;
      const center: [number, number] = initial ? [initial.latitude, initial.longitude] : [4.5709, -74.2973];
      this.map = L.map(this.mapContainer.nativeElement, { center, zoom: initial ? 16 : 6 });
      this.tiles = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19, attribution: '&copy; Esri — World Street Map',
      });
      this.tiles.on('loading', () => this.loading.set(true));
      this.tiles.on('load', () => { this.loading.set(false); this.clearTimeout(); });
      this.tiles.on('tileerror', () => {
        this.loading.set(false);
        this.error.set('No se pudo cargar el mapa. Revisa la conexión y pulsa Reintentar.');
        this.clearTimeout();
      });
      this.tiles.addTo(this.map);
      const pin = L.divIcon({ className: 'location-picker-pin', html: '<span aria-hidden="true">📍</span>', iconSize: [32, 40], iconAnchor: [16, 36] });
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
      this.startTimeout();
    } catch {
      if (!this.disposed) { this.loading.set(false); this.error.set('No fue posible abrir el mapa. Cierra e intenta nuevamente.'); }
    }
  }

  confirm(): void {
    const coordinates = this.selected();
    if (coordinates && !this.loading() && !this.error()) this.confirmed.emit(coordinates);
  }

  retry(): void {
    if (!this.tiles) return;
    this.error.set(''); this.loading.set(true);
    this.tiles.redraw(); this.startTimeout();
  }

  cancel(event?: Event): void { event?.preventDefault(); this.closed.emit(); }
  private clearTimeout(): void { if (this.loadTimeout !== null) clearTimeout(this.loadTimeout); this.loadTimeout = null; }
  private startTimeout(): void {
    this.clearTimeout();
    this.loadTimeout = setTimeout(() => { this.loading.set(false); this.error.set('El mapa tardó demasiado en responder. Pulsa Reintentar.'); }, 15000);
  }
  ngOnDestroy(): void {
    this.disposed = true; this.clearTimeout(); this.map?.remove();
    this.dialog.nativeElement.close();
  }
}
