import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { type Subscription, timer } from 'rxjs';
import { retry } from 'rxjs/operators';
import { webSocket } from 'rxjs/webSocket';
import { parseTick, type PriceTick, streamUrl } from './binance';

export type StreamStatus = 'connecting' | 'live' | 'offline';

const MAX_BACKOFF_MS = 30_000;

/**
 * Precios en vivo con signals. Se provee por componente: cada instancia de
 * <bank-investments> tiene su conexión y la cierra al destruirse.
 */
@Injectable()
export class PricesService {
  readonly ticks = signal<Readonly<Record<string, PriceTick>>>({});
  readonly status = signal<StreamStatus>('connecting');

  private subscription?: Subscription;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.subscription?.unsubscribe());
  }

  connect(symbols: readonly string[]): void {
    this.subscription?.unsubscribe();
    if (symbols.length === 0) return;

    const socket = webSocket<unknown>({
      url: streamUrl(symbols),
      openObserver: { next: () => this.status.set('live') },
      closeObserver: { next: () => this.status.set('offline') },
    });

    this.subscription = socket
      .pipe(
        // Reconexión con espera exponencial (1 s, 2 s, 4 s… hasta 30 s).
        retry({
          delay: (_, attempt) => {
            this.status.set('connecting');
            return timer(Math.min(1_000 * 2 ** (attempt - 1), MAX_BACKOFF_MS));
          },
        }),
      )
      .subscribe((message) => {
        const tick = parseTick(message);
        if (tick)
          this.ticks.update((ticks) => ({ ...ticks, [tick.symbol]: tick }));
      });
  }
}
