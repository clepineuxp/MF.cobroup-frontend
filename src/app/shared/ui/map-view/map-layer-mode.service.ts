import { computed, inject, Injectable, signal } from '@angular/core';
import { ThemeService } from '../../../themes/theme.service';

export type MapLayerMode = 'streets' | 'dark' | 'satellite';

@Injectable({ providedIn: 'root' })
export class MapLayerModeService {
  private readonly themeService = inject(ThemeService);

  readonly isSatelliteMode = signal(false);
  readonly activeLayerMode = computed<MapLayerMode>(() => {
    if (this.isSatelliteMode()) return 'satellite';
    return this.themeService.theme() === 'dark' ? 'dark' : 'streets';
  });

  toggleSatelliteMode(): void {
    this.isSatelliteMode.update((enabled) => !enabled);
  }
}
