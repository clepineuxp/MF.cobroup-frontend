import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  beforeEach(() => { localStorage.clear(); TestBed.resetTestingModule(); });

  it('uses light on a first visit', () => {
    const service = TestBed.inject(ThemeService);
    expect(service.theme()).toBe('light');
    expect(document.documentElement.dataset['theme']).toBe('light');
  });

  it('persists an explicit dark preference', () => {
    const service = TestBed.inject(ThemeService);
    service.setTheme('dark');
    expect(service.theme()).toBe('dark');
    expect(localStorage.getItem('cobroup-theme')).toBe('dark');
  });
});
