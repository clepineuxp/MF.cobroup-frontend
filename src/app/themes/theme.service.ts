import { DOCUMENT } from '@angular/common';
import { inject, Injectable, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly storageKey = 'cobroup-theme';
  readonly theme = signal<ThemeMode>(this.readStoredTheme());

  constructor() { this.apply(this.theme()); }

  setTheme(mode: ThemeMode): void {
    this.theme.set(mode);
    this.apply(mode);
    try { this.document.defaultView?.localStorage.setItem(this.storageKey, mode); } catch { /* Optional storage. */ }
  }

  toggleTheme(): void { this.setTheme(this.theme() === 'light' ? 'dark' : 'light'); }

  private readStoredTheme(): ThemeMode {
    try {
      const stored = this.document.defaultView?.localStorage.getItem(this.storageKey);
      return stored === 'dark' || stored === 'light' ? stored : 'light';
    } catch { return 'light'; }
  }

  private apply(mode: ThemeMode): void { this.document.documentElement.dataset['theme'] = mode; }
}
