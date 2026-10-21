import {
  ErrorHandler,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { createCustomElement } from '@angular/elements';
import { createApplication } from '@angular/platform-browser';
import { INVESTMENTS_ELEMENT_TAG } from '@qolqa/contracts';
import { InvestmentsComponent } from './app/investments.component';
import { ShellErrorHandler } from './app/shell-error-handler';

let defining: Promise<void> | null = null;

/**
 * Módulo expuesto por Native Federation (./Element). Registra <bank-investments>
 * una sola vez aunque el shell lo pida varias veces (navegar ida y vuelta).
 * Sin Zone.js: Angular no modifica Promise, setTimeout ni fetch del shell React.
 */
export function defineInvestmentsElement(): Promise<void> {
  defining ??= (async () => {
    if (customElements.get(INVESTMENTS_ELEMENT_TAG)) return;
    const app = await createApplication({
      providers: [
        provideZonelessChangeDetection(),
        provideBrowserGlobalErrorListeners(),
        { provide: ErrorHandler, useClass: ShellErrorHandler },
      ],
    });
    const element = createCustomElement(InvestmentsComponent, {
      injector: app.injector,
    });
    customElements.define(INVESTMENTS_ELEMENT_TAG, element);
  })();
  return defining;
}
