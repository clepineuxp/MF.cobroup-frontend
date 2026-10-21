import { CurrencyPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { AvailableLoanTemplate } from '../data/loan-template.models';
import { LoanTemplatesService } from '../data/loan-templates.service';

@Component({
  selector: 'app-loan-templates-page',
  imports: [CurrencyPipe],
  templateUrl: './loan-templates.page.html',
  styleUrl: './loan-templates.page.scss',
})
export class LoanTemplatesPage {
  private readonly service = inject(LoanTemplatesService);
  readonly templates = signal<readonly AvailableLoanTemplate[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');

  constructor() { void this.load(); }

  private async load(): Promise<void> {
    try { this.templates.set(await this.service.listAvailable()); }
    catch (error) { this.error.set(error instanceof Error ? error.message : 'No fue posible consultar las plantillas.'); }
    finally { this.loading.set(false); }
  }
}
