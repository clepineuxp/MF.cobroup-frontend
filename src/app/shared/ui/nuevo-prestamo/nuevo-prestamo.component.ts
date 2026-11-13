import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, Output, signal } from '@angular/core';
import { CustomerModalComponent } from '../customer-modal/customer-modal.component';
import { LoanOriginationModalComponent } from '../loan-origination-modal/loan-origination-modal.component';
import { LoanDetails } from '../../../features/loans/data/loan.models';

export type NuevoPrestamoState = 'collapsed' | 'options' | 'new-customer' | 'existing-customer';

@Component({
  selector: 'app-nuevo-prestamo',
  standalone: true,
  imports: [CommonModule, CustomerModalComponent, LoanOriginationModalComponent],
  templateUrl: './nuevo-prestamo.component.html',
  styleUrl: './nuevo-prestamo.component.scss',
})
export class NuevoPrestamoComponent {
  @Input() routeId = '';
  @Input() isBlocked = false;

  @Output() readonly customerSaved = new EventEmitter<string>();
  @Output() readonly loanCreated = new EventEmitter<LoanDetails>();
  @Output() readonly blockedAttempt = new EventEmitter<void>();

  readonly state = signal<NuevoPrestamoState>('collapsed');

  openOptions(): void {
    if (this.isBlocked) {
      this.blockedAttempt.emit();
      return;
    }
    this.state.set('options');
  }

  collapse(): void {
    this.state.set('collapsed');
  }

  openNewCustomer(): void {
    this.state.set('new-customer');
  }

  openExistingCustomer(): void {
    this.state.set('existing-customer');
  }

  onCustomerModalClosed(): void {
    this.collapse();
  }

  onCustomerSaved(customerId: string): void {
    this.customerSaved.emit(customerId);
    this.collapse();
  }

  onLoanModalClosed(): void {
    this.collapse();
  }

  onLoanCreated(loan: LoanDetails): void {
    this.loanCreated.emit(loan);
    this.collapse();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.state() === 'options') {
      this.collapse();
    }
  }
}

