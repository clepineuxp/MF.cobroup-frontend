import { Component, inject } from '@angular/core';
import { ThemeService } from '../../../themes/theme.service';

@Component({
  selector: 'app-theme-switch',
  template: `<button type="button" (click)="theme.toggleTheme()" [attr.aria-pressed]="theme.theme() === 'dark'">Tema: {{ theme.theme() === 'light' ? 'claro' : 'oscuro' }}</button>`,
  styleUrl: './theme-switch.component.scss',
})
export class ThemeSwitchComponent { protected readonly theme = inject(ThemeService); }
