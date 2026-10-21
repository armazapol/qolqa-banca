import { signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { INVESTMENTS_EVENTS } from '@qolqa/contracts';
import { InvestmentsComponent } from './investments.component';
import { AuthRequiredError, PortfolioService } from './portfolio.service';
import { PricesService } from './prices.service';

const holdings = [
  { symbol: 'BTCUSDT', name: 'Bitcoin', quantity: 0.5, avgPriceUsd: 60_000 },
];

function setup(portfolio: Partial<PortfolioService>) {
  const prices = {
    ticks: signal({
      BTCUSDT: { symbol: 'BTCUSDT', price: 66_000, open24h: 60_000 },
    }),
    status: signal<'live'>('live'),
    connect: jest.fn(),
  };
  TestBed.configureTestingModule({ imports: [InvestmentsComponent] });
  // Los servicios se proveen a nivel de componente: se sustituyen ahí.
  TestBed.overrideComponent(InvestmentsComponent, {
    set: {
      providers: [
        { provide: PortfolioService, useValue: portfolio },
        { provide: PricesService, useValue: prices },
      ],
    },
  });
  const fixture: ComponentFixture<InvestmentsComponent> =
    TestBed.createComponent(InvestmentsComponent);
  const events: CustomEvent[] = [];
  for (const type of Object.values(INVESTMENTS_EVENTS)) {
    fixture.nativeElement.addEventListener(type, (event: CustomEvent) =>
      events.push(event),
    );
  }
  fixture.componentRef.setInput(
    'getAccessToken',
    async () => 'token-del-shell',
  );
  fixture.componentRef.setInput('apiBaseUrl', '/api');
  return { fixture, prices, events };
}

/** El componente usa Shadow DOM: se consulta dentro de su shadowRoot. */
const shadow = (fixture: ComponentFixture<unknown>): ShadowRoot =>
  (fixture.nativeElement as HTMLElement).shadowRoot as ShadowRoot;

describe('InvestmentsComponent', () => {
  it('muestra el portafolio valorizado y se suscribe a los precios de sus activos', async () => {
    const getHoldings = jest.fn().mockResolvedValue(holdings);
    const { fixture, prices } = setup({
      holdings: getHoldings,
      officialSell: jest.fn().mockResolvedValue(3.5),
    });

    fixture.detectChanges();
    await fixture.whenStable();

    const text = shadow(fixture).textContent ?? '';
    expect(text).toContain('Bitcoin');
    expect(text).toContain('US$ 33,000.00');
    expect(text).toContain('S/ 115,500.00');
    expect(text).toContain('+10.00%');
    expect(prices.connect).toHaveBeenCalledWith(['BTCUSDT']);
    // El token se pide al shell, no se guarda en el remote.
    expect(getHoldings).toHaveBeenCalledWith('/api', expect.any(Function));
  });

  it('avisa al shell con investments:error si la sesión expiró', async () => {
    const { fixture, events } = setup({
      holdings: jest.fn().mockRejectedValue(new AuthRequiredError()),
      officialSell: jest.fn().mockResolvedValue(null),
    });

    fixture.detectChanges();
    await fixture.whenStable();

    const error = events.find(
      (event) => event.type === INVESTMENTS_EVENTS.error,
    );
    expect(error?.detail).toEqual({
      kind: 'auth',
      message: expect.stringContaining('sesión expiró'),
    });
    // composed: el evento atraviesa el Shadow DOM hasta el shell.
    expect(error?.composed).toBe(true);
    expect(shadow(fixture).querySelector('[role="alert"]')).not.toBeNull();
  });

  it('pide al shell navegar a transferencias', async () => {
    const { fixture, events } = setup({
      holdings: jest.fn().mockResolvedValue(holdings),
      officialSell: jest.fn().mockResolvedValue(3.5),
    });
    fixture.detectChanges();
    await fixture.whenStable();

    const button = [...shadow(fixture).querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Transferir fondos'),
    );
    button?.click();

    expect(
      events.find((event) => event.type === INVESTMENTS_EVENTS.navigate)
        ?.detail,
    ).toEqual({
      to: '/app/transferir',
    });
  });
});
