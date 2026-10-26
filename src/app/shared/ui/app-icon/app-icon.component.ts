import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-icon', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    @switch (name) {
      @case ('diamond') { <path d="m12 2 10 10-10 10L2 12 12 2Z"/><path d="m12 7 5 5-5 5-5-5 5-5Z"/> }
      @case ('calendar') { <rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/> }
      @case ('route') { <circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h3a3 3 0 0 0 3-3V9a3 3 0 0 1 3-3"/> }
      @case ('users') { <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/> }
      @case ('money') { <circle cx="12" cy="12" r="9"/><path d="M16 8.5c-.8-.8-2-1.25-3.5-1.25-2 0-3.5.9-3.5 2.25 0 3.5 7 1.5 7 5 0 1.35-1.5 2.25-3.5 2.25-1.5 0-2.8-.45-3.7-1.35M12 5v14"/> }
      @case ('scale') { <path d="M12 3v18M5 6h14M5 6l-3 6h6L5 6ZM19 6l-3 6h6l-3-6ZM8 21h8"/> }
      @case ('clipboard') { <rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4.5V3h6v1.5M8 9h8M8 13h8M8 17h5"/> }
      @case ('bolt') { <path d="m13 2-8 12h7l-1 8 8-12h-7l1-8Z"/> }
      @case ('customer') { <circle cx="12" cy="8" r="4"/><path d="M4 21c.8-4.4 3.5-6.5 8-6.5s7.2 2.1 8 6.5"/> }
      @case ('payment') { <path d="M4 8h16M4 16h16M7 5 4 8l3 3M17 13l3 3-3 3"/> }
      @case ('map') { <path d="m3 6 5-2 8 2 5-2v14l-5 2-8-2-5 2V6Z"/><path d="M8 4v14M16 6v14"/> }
      @case ('analytics') { <path d="M4 19V9M10 19V5M16 19v-7M22 19V2"/> }
      @case ('settings') { <circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M2 12h3M19 12h3M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12"/> }
      @case ('logout') { <path d="M10 17l5-5-5-5M15 12H3M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5"/> }
      @case ('plus') { <path d="M12 5v14M5 12h14"/> }
      @case ('eye') { <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/> }
      @case ('eye-off') { <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/> }
      @default { <circle cx="12" cy="12" r="9"/> }
    }
  </svg>`,
  styles: [':host{display:inline-grid;width:1.25rem;height:1.25rem;place-items:center;color:inherit}:host svg{display:block;width:100%;height:100%}'],
})
export class AppIconComponent { @Input() name = 'diamond'; }
