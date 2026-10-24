import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { MapLayerMode, MapLayerModeService } from './map-layer-mode.service';

export interface MapPoint {
  customerId: string;
  customerName: string;
  businessOrWorkName?: string | null;
  address?: string | null;
  latitude: number | null;
  longitude: number | null;
  status: string;
  markerColor: string;
  dueTodayAmount?: number;
  overdueAmount?: number;
  loanBalance?: number;
  avatarUrl?: string | null;
}

@Component({
  selector: 'app-map-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './map-view.component.html',
  styleUrl: './map-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapViewComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() points: readonly MapPoint[] = [];
  @Input() selectedPointId: string | null = null;
  @Input() height = '100%';

  @Output() readonly pointSelected = new EventEmitter<MapPoint>();

  @ViewChild('containerRef') containerRef?: ElementRef<HTMLDivElement>;

  private readonly layerModeService = inject(MapLayerModeService);

  readonly zoomLevel = signal(14);
  readonly centerLat = signal(4.60971);
  readonly centerLon = signal(-74.08175);

  readonly isSatelliteMode = this.layerModeService.isSatelliteMode;
  readonly activeLayerMode = this.layerModeService.activeLayerMode;

  readonly layerModeIcon = computed(() => {
    return this.isSatelliteMode() ? '🗺️' : '🛰️';
  });

  readonly layerModeLabel = computed(() => {
    return this.isSatelliteMode()
      ? 'Volver al mapa estándar (tema de la página)'
      : 'Cambiar a vista satelital';
  });

  private map: any = null;
  private markersLayer: any = null;
  private currentTileLayers: any[] = [];
  private markerMap = new Map<string, any>();
  private leafletModule: any = null;
  private resizeObserver: ResizeObserver | null = null;

  constructor() {
    effect(() => {
      const mode = this.activeLayerMode();
      this.setLayerMode(mode);
    });
  }

  async ngAfterViewInit(): Promise<void> {
    if (typeof window === 'undefined' || !this.containerRef?.nativeElement) return;
    await this.initLeafletMap();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['points'] && this.map) {
      this.updateMarkers();
      this.fitToBounds();
    }
    if (changes['selectedPointId'] && this.map) {
      this.highlightSelectedMarker();
    }
  }

  ngOnDestroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  private async initLeafletMap(): Promise<void> {
    if (!this.containerRef?.nativeElement || typeof window === 'undefined') return;

    try {
      const leafletRaw = await import('leaflet');
      const L: any =
        (leafletRaw as any).default?.map
          ? (leafletRaw as any).default
          : (leafletRaw as any).map
            ? leafletRaw
            : (typeof window !== 'undefined' && (window as any).L
                ? (window as any).L
                : ((leafletRaw as any).default ?? leafletRaw));
      this.leafletModule = L;

      this.map = L.map(this.containerRef.nativeElement, {
        center: [this.centerLat(), this.centerLon()],
        zoom: this.zoomLevel(),
        zoomControl: false,
        attributionControl: false,
      });

      this.markersLayer = L.layerGroup().addTo(this.map);
      this.setLayerMode(this.activeLayerMode());
      this.updateMarkers();

      if (this.points.length > 0) {
        this.fitToBounds();
      }

      // Responsive map invalidation on layout render and viewport resizes
      this.map.invalidateSize();
      setTimeout(() => this.map?.invalidateSize(), 100);
      setTimeout(() => this.map?.invalidateSize(), 400);

      if (typeof ResizeObserver !== 'undefined' && this.containerRef?.nativeElement) {
        this.resizeObserver = new ResizeObserver(() => {
          this.map?.invalidateSize();
        });
        this.resizeObserver.observe(this.containerRef.nativeElement);
      }
    } catch (e) {
      console.warn('Leaflet map initialization skipped or not supported in this environment.', e);
    }
  }

  setLayerMode(mode: MapLayerMode): void {
    if (!this.map || !this.leafletModule) return;
    const L = this.leafletModule;

    for (const layer of this.currentTileLayers) {
      try {
        this.map.removeLayer(layer);
      } catch {
        // Safe removal
      }
    }
    this.currentTileLayers = [];

    if (mode === 'streets') {
      const streetLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.esri.com/" target="_blank" rel="noopener">Esri</a> &mdash; World Street Map',
        }
      ).addTo(this.map);
      this.currentTileLayers.push(streetLayer);
      streetLayer.bringToBack();
    } else if (mode === 'dark') {
      const darkBase = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 16,
          attribution: '&copy; <a href="https://www.esri.com/" target="_blank" rel="noopener">Esri</a> &mdash; Dark Gray Canvas',
        }
      ).addTo(this.map);
      const darkRef = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 16,
        }
      ).addTo(this.map);
      this.currentTileLayers.push(darkBase, darkRef);
      darkBase.bringToBack();
    } else if (mode === 'satellite') {
      const satLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.esri.com/" target="_blank" rel="noopener">Esri</a> &mdash; Satellite',
        }
      ).addTo(this.map);
      const roadOverlay = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 19,
        }
      ).addTo(this.map);
      this.currentTileLayers.push(satLayer, roadOverlay);
      satLayer.bringToBack();
    }

    if (this.markersLayer && typeof this.markersLayer.bringToFront === 'function') {
      this.markersLayer.bringToFront();
    }
  }

  toggleSatelliteMode(): void {
    this.layerModeService.toggleSatelliteMode();
  }

  updateMarkers(): void {
    if (!this.map || !this.markersLayer || !this.leafletModule) return;
    const L = this.leafletModule;

    this.markersLayer.clearLayers();
    this.markerMap.clear();

    for (const point of this.points) {
      if (point.latitude === null || point.longitude === null) continue;

      const isSelected = point.customerId === this.selectedPointId;
      const icon = this.createAvatarIcon(point, isSelected);

      const marker = L.marker([point.latitude, point.longitude], {
        icon,
        title: point.customerName,
        zIndexOffset: isSelected ? 1000 : 10,
      });

      marker.on('click', () => {
        this.selectPoint(point);
      });

      this.markersLayer.addLayer(marker);
      this.markerMap.set(point.customerId, marker);
    }
  }

  private createAvatarIcon(point: MapPoint, isSelected: boolean): any {
    if (!this.leafletModule) return null;
    const L = this.leafletModule;

    const initials = this.getInitials(point.customerName);
    const shortName =
      point.customerName.length > 14
        ? point.customerName.substring(0, 12) + '…'
        : point.customerName;

    const avatarHtml = point.avatarUrl
      ? `<img src="${point.avatarUrl}" alt="${point.customerName}" class="avatar-photo" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" /><span class="avatar-initials" style="display:none;">${initials}</span>`
      : `<span class="avatar-initials">${initials}</span>`;

    const html = `
      <div class="map-avatar-pin ${isSelected ? 'selected' : ''}" style="--pin-color: ${point.markerColor};">
        ${isSelected ? '<div class="avatar-halo"></div>' : ''}
        <div class="avatar-circle">
          ${avatarHtml}
          <span class="status-indicator-dot"></span>
        </div>
        <div class="avatar-label-bubble">
          <span class="name-text">${shortName}</span>
        </div>
        <div class="pin-tip"></div>
      </div>
    `;

    return L.divIcon({
      className: 'leaflet-avatar-container',
      html,
      iconSize: [44, 58],
      iconAnchor: [22, 58],
      popupAnchor: [0, -58],
    });
  }

  private highlightSelectedMarker(): void {
    if (!this.leafletModule) return;
    for (const point of this.points) {
      const marker = this.markerMap.get(point.customerId);
      if (!marker) continue;

      const isSelected = point.customerId === this.selectedPointId;
      marker.setIcon(this.createAvatarIcon(point, isSelected));
      marker.setZIndexOffset(isSelected ? 1000 : 10);

      if (isSelected && point.latitude !== null && point.longitude !== null) {
        this.map?.panTo([point.latitude, point.longitude], { animate: true });
      }
    }
  }

  fitToBounds(): void {
    const valid = this.points.filter((p) => p.latitude !== null && p.longitude !== null);
    if (valid.length === 0) return;

    if (this.map && this.leafletModule) {
      const L = this.leafletModule;
      const latLngs = valid.map((p) => [p.latitude!, p.longitude!] as [number, number]);
      if (latLngs.length === 1) {
        this.map.setView(latLngs[0], 15);
      } else {
        this.map.fitBounds(L.latLngBounds(latLngs), { padding: [50, 50], maxZoom: 16 });
      }
    } else {
      const avgLat = valid.reduce((sum, p) => sum + p.latitude!, 0) / valid.length;
      const avgLon = valid.reduce((sum, p) => sum + p.longitude!, 0) / valid.length;
      this.centerLat.set(avgLat);
      this.centerLon.set(avgLon);
      this.zoomLevel.set(valid.length > 1 ? 13 : 15);
    }
  }

  zoomIn(): void {
    if (this.map) {
      this.map.zoomIn();
    } else {
      this.zoomLevel.update((z) => Math.min(z + 1, 18));
    }
  }

  zoomOut(): void {
    if (this.map) {
      this.map.zoomOut();
    } else {
      this.zoomLevel.update((z) => Math.max(z - 1, 10));
    }
  }

  selectPoint(point: MapPoint): void {
    if (point.latitude !== null && point.longitude !== null) {
      this.centerLat.set(point.latitude);
      this.centerLon.set(point.longitude);
      this.map?.panTo([point.latitude, point.longitude], { animate: true });
    }
    this.pointSelected.emit(point);
  }

  getInitials(name: string): string {
    if (!name) return 'C';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  }
}
