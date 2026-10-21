import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  type OnInit,
  PendingTasks,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import {
  INVESTMENTS_EVENTS,
  type InvestmentsEventDetail,
} from '@qolqa/contracts';
import { MoneyPipe, PercentPipe, QuantityPipe } from './format.pipes';
import { buildRows, buildTotals } from './portfolio';
import {
  AuthRequiredError,
  type Holding,
  PortfolioService,
} from './portfolio.service';
import { PricesService } from './prices.service';

/**
 * Microfrontend "Inversiones" (ADR-0020).
 * - ShadowDom: los estilos del shell no entran y los de Angular Material no salen.
 * - Zoneless + signals + OnPush: no toca APIs globales del navegador del shell.
 * - Sin componentes de overlay (diálogos, menús): se renderizarían fuera del Shadow DOM.
 */
@Component({
  selector: 'inv-investments',
  encapsulation: ViewEncapsulation.ShadowDom,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatCardModule,
    MatButtonModule,
    MatProgressBarModule,
    MoneyPipe,
    PercentPipe,
    QuantityPipe,
  ],
  providers: [PortfolioService, PricesService],
  templateUrl: './investments.component.html',
  styleUrl: './investments.component.scss',
})
export class InvestmentsComponent implements OnInit {
  /** Contrato con el shell (ADR-0010): se asignan como propiedades JS, nunca como atributos. */
  readonly getAccessToken = input<() => Promise<string | null>>(
    async () => null,
  );
  readonly apiBaseUrl = input('/api');

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly portfolio = inject(PortfolioService);
  private readonly prices = inject(PricesService);
  // Sin Zone.js, Angular solo sabe que la vista "está lista" si se le registra la tarea.
  private readonly pendingTasks = inject(PendingTasks);

  protected readonly holdings = signal<Holding[] | null>(null);
  protected readonly fxSell = signal<number | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly streamStatus = this.prices.status;

  protected readonly rows = computed(() =>
    buildRows(this.holdings() ?? [], this.prices.ticks()),
  );
  protected readonly totals = computed(() =>
    buildTotals(this.rows(), this.fxSell()),
  );
  protected readonly loading = computed(
    () => this.holdings() === null && this.error() === null,
  );

  ngOnInit(): void {
    void this.load();
    this.emit(INVESTMENTS_EVENTS.analytics, { name: 'investments_view' });
  }

  protected async load(): Promise<void> {
    const done = this.pendingTasks.add();
    this.error.set(null);
    try {
      const [holdings, fxSell] = await Promise.all([
        this.portfolio.holdings(this.apiBaseUrl(), this.getAccessToken()),
        this.portfolio.officialSell(this.apiBaseUrl()),
      ]);
      this.holdings.set(holdings);
      this.fxSell.set(fxSell);
      this.prices.connect(holdings.map((holding) => holding.symbol));
    } catch (error) {
      const auth = error instanceof AuthRequiredError;
      const message = auth
        ? error.message
        : 'No pudimos cargar tu portafolio. Inténtalo nuevamente.';
      this.error.set(message);
      this.emit(INVESTMENTS_EVENTS.error, {
        message,
        kind: auth ? 'auth' : 'network',
      });
    } finally {
      done();
    }
  }

  protected goToTransfer(): void {
    this.emit(INVESTMENTS_EVENTS.navigate, { to: '/app/transferir' });
  }

  /** composed: true para que el evento atraviese el Shadow DOM y llegue al shell. */
  private emit<K extends keyof InvestmentsEventDetail>(
    type: K,
    detail: InvestmentsEventDetail[K],
  ): void {
    this.host.nativeElement.dispatchEvent(
      new CustomEvent(type, { detail, bubbles: true, composed: true }),
    );
  }
}
