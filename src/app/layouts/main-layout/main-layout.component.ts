import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeSwitchComponent } from '../../shared/ui/theme-switch/theme-switch.component';
import { OrganizationSwitcherComponent } from '../../features/organization-session/components/organization-switcher.component';

@Component({ selector: 'app-main-layout', imports: [RouterOutlet, ThemeSwitchComponent, OrganizationSwitcherComponent], templateUrl: './main-layout.component.html', styleUrl: './main-layout.component.scss' })
export class MainLayoutComponent {}
