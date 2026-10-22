import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ThemeSwitchComponent } from '../../shared/ui/theme-switch/theme-switch.component';
import { OrganizationSwitcherComponent } from '../../features/organization-session/components/organization-switcher.component';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ThemeSwitchComponent, OrganizationSwitcherComponent],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss'
})
export class MainLayoutComponent {
  private readonly auth = inject(AuthService);
  readonly isAuthenticated = this.auth.isAuthenticated;

  async logout(): Promise<void> {
    await this.auth.logout();
  }
}
