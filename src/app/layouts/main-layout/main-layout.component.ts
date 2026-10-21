import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeSwitchComponent } from '../../shared/ui/theme-switch/theme-switch.component';

@Component({ selector: 'app-main-layout', imports: [RouterOutlet, ThemeSwitchComponent], templateUrl: './main-layout.component.html', styleUrl: './main-layout.component.scss' })
export class MainLayoutComponent {}
