import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-caja-blocked-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './caja-blocked-dialog.component.html',
  styleUrl: './caja-blocked-dialog.component.scss',
})
export class CajaBlockedDialogComponent {
  private readonly router = inject(Router);

  @Input() isOpen = false;
  @Input() message = 'Debes cerrar caja para continuar.';
  @Input() routeId = '';
  @Output() readonly closed = new EventEmitter<void>();

  close(): void {
    this.closed.emit();
  }

  goToCaja(): void {
    this.closed.emit();
    const queryParams = this.routeId ? { routeId: this.routeId } : undefined;
    void this.router.navigate(['/balance-ruta'], { queryParams });
  }
}

