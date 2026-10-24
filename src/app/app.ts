import { PwaUpdateComponent } from './shared/ui/pwa-update/pwa-update.component';
import { Component } from '@angular/core';
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';

@Component({
  selector: 'app-root',
  imports: [MainLayoutComponent, PwaUpdateComponent],
  template: '<app-main-layout /><app-pwa-update />',
  styleUrl: './app.scss'
})
export class App {}
