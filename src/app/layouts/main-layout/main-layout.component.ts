import { PwaUpdateService } from '../../core/pwa/pwa-update.service';
import { CommonModule } from '@angular/common';
import { Component, HostListener, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ThemeSwitchComponent } from '../../shared/ui/theme-switch/theme-switch.component';
import { OrganizationSwitcherComponent } from '../../features/organization-session/components/organization-switcher.component';
import { AuthService } from '../../core/auth/auth.service';
import { ThemeService } from '../../themes/theme.service';
import { AppIconComponent } from '../../shared/ui/app-icon/app-icon.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    ThemeSwitchComponent,
    OrganizationSwitcherComponent,
    AppIconComponent,
  ],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
  host: {
    '[attr.data-theme]': 'themeService.theme()',
  },
})
export class MainLayoutComponent {
  private readonly auth = inject(AuthService);
  protected readonly themeService = inject(ThemeService);

  readonly pwa = inject(PwaUpdateService);
  readonly isAuthenticated = this.auth.isAuthenticated;
  readonly userContext = this.auth.context;

  readonly drawerOpen = signal(false);
  readonly notchExpanded = signal(false);

  toggleDrawer(): void {
    this.drawerOpen.update((v) => !v);
  }

  closeDrawer(): void {
    this.drawerOpen.set(false);
  }

  toggleNotch(): void {
    this.notchExpanded.update((v) => !v);
  }

  closeNotch(): void {
    this.notchExpanded.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeDrawer();
    this.closeNotch();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.notchExpanded()) return;
    const target = event.target as HTMLElement | null;
    if (target && !target.closest('.app-notch-container')) {
      this.closeNotch();
    }
  }

  @HostListener('document:touchstart', ['$event'])
  onDocumentTouchStart(event: TouchEvent): void {
    if (!this.notchExpanded()) return;
    const target = event.target as HTMLElement | null;
    if (target && !target.closest('.app-notch-container')) {
      this.closeNotch();
    }
  }

  @HostListener('document:focusin', ['$event'])
  onDocumentFocusIn(event: FocusEvent): void {
    if (!this.notchExpanded()) return;
    const target = event.target as HTMLElement | null;
    if (target && !target.closest('.app-notch-container')) {
      this.closeNotch();
    }
  }

  async logout(): Promise<void> {
    this.closeNotch();
    this.closeDrawer();
    await this.auth.logout();
  }
}
