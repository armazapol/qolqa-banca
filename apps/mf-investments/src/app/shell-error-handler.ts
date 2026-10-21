import { ErrorHandler, Injectable } from '@angular/core';
import {
  INVESTMENTS_EVENTS,
  type InvestmentsEventDetail,
} from '@qolqa/contracts';

/**
 * Errores no controlados del remote → shell (ADR-0021). La página tiene una sola
 * instancia de Sentry, la del shell: el remote no inicializa la suya y le
 * entrega el error por el contrato de eventos.
 */
@Injectable()
export class ShellErrorHandler implements ErrorHandler {
  handleError(error: unknown): void {
    const detail: InvestmentsEventDetail[typeof INVESTMENTS_EVENTS.error] = {
      kind: 'unknown',
      message:
        error instanceof Error
          ? error.message
          : 'Error inesperado en Inversiones',
      stack: error instanceof Error ? error.stack : undefined,
    };
    window.dispatchEvent(new CustomEvent(INVESTMENTS_EVENTS.error, { detail }));
    console.error(error);
  }
}
