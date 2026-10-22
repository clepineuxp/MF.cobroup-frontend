import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
  signal,
} from '@angular/core';

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
}

@Component({
  selector: 'app-map-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './map-view.component.html',
  styleUrl: './map-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapViewComponent implements OnChanges {
  @Input() points: readonly MapPoint[] = [];
  @Input() selectedPointId: string | null = null;
  @Input() height = '450px';

  @Output() readonly pointSelected = new EventEmitter<MapPoint>();

  @ViewChild('containerRef') containerRef?: ElementRef<HTMLDivElement>;

  readonly zoomLevel = signal(14);
  readonly centerLat = signal(4.60971);
  readonly centerLon = signal(-74.08175);
  readonly activePopupPoint = signal<MapPoint | null>(null);

  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private initialCenterLat = 0;
  private initialCenterLon = 0;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['points'] && this.points.length > 0) {
      this.fitToBounds();
    }
    if (changes['selectedPointId']) {
      const match = this.points.find((p) => p.customerId === this.selectedPointId);
      if (match) {
        this.selectPoint(match);
      }
    }
  }

  fitToBounds(): void {
    const valid = this.points.filter((p) => p.latitude !== null && p.longitude !== null);
    if (valid.length === 0) return;

    const avgLat = valid.reduce((sum, p) => sum + p.latitude!, 0) / valid.length;
    const avgLon = valid.reduce((sum, p) => sum + p.longitude!, 0) / valid.length;

    this.centerLat.set(avgLat);
    this.centerLon.set(avgLon);
    this.zoomLevel.set(valid.length > 1 ? 13 : 15);
  }

  zoomIn(): void {
    this.zoomLevel.update((z) => Math.min(z + 1, 18));
  }

  zoomOut(): void {
    this.zoomLevel.update((z) => Math.max(z - 1, 10));
  }

  selectPoint(point: MapPoint): void {
    this.activePopupPoint.set(point);
    if (point.latitude !== null && point.longitude !== null) {
      this.centerLat.set(point.latitude);
      this.centerLon.set(point.longitude);
    }
    this.pointSelected.emit(point);
  }

  closePopup(): void {
    this.activePopupPoint.set(null);
  }

  getScreenX(lon: number | null): number {
    if (lon === null) return 0;
    const width = 800;
    const scale = Math.pow(2, this.zoomLevel() - 11);
    const deltaLon = lon - this.centerLon();
    return width / 2 + deltaLon * 800 * scale;
  }

  getScreenY(lat: number | null): number {
    if (lat === null) return 0;
    const height = 500;
    const scale = Math.pow(2, this.zoomLevel() - 11);
    const deltaLat = lat - this.centerLat();
    return height / 2 - deltaLat * 1000 * scale;
  }

  onMouseDown(e: MouseEvent): void {
    if ((e.target as HTMLElement).closest('.marker-pin, .map-controls, .map-popup')) return;
    this.isDragging = true;
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;
    this.initialCenterLat = this.centerLat();
    this.initialCenterLon = this.centerLon();
  }

  onMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return;
    const dx = e.clientX - this.dragStartX;
    const dy = e.clientY - this.dragStartY;
    const scale = Math.pow(2, this.zoomLevel() - 11);

    const lonOffset = dx / (800 * scale);
    const latOffset = dy / (1000 * scale);

    this.centerLon.set(this.initialCenterLon - lonOffset);
    this.centerLat.set(this.initialCenterLat + latOffset);
  }

  onMouseUp(): void {
    this.isDragging = false;
  }
}
