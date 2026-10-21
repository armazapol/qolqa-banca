import { screen, waitFor } from '@testing-library/react';
import { INVESTMENTS_ELEMENT_TAG, INVESTMENTS_EVENTS } from '@qolqa/contracts';
import { tokenStore } from '../../app/lib/api/token-store';
import Inversiones from '../../app/routes/app/inversiones';
import { renderRoute } from '../render';

interface FakeInvestmentsElement extends HTMLElement {
  getAccessToken?: () => Promise<string | null>;
  apiBaseUrl?: string;
}

/** Sustituye al remote Angular: un custom element mínimo con el mismo contrato. */
jest.mock('../../app/features/investments/load-investments', () => ({
  loadInvestmentsElement: jest.fn(async () => {
    if (!globalThis.customElements.get('bank-investments')) {
      globalThis.customElements.define(
        'bank-investments',
        class extends globalThis.HTMLElement {
          getAccessToken?: () => Promise<string | null>;
          apiBaseUrl?: string;
        },
      );
    }
  }),
}));

function Transferir() {
  return <h1>Pantalla de transferencia</h1>;
}

async function renderInvestments() {
  const result = renderRoute(Inversiones, {
    path: '/app/inversiones',
    extraRoutes: [{ path: '/app/transferir', Component: Transferir }],
  });
  await waitFor(() =>
    expect(document.querySelector(INVESTMENTS_ELEMENT_TAG)).not.toBeNull(),
  );
  return {
    ...result,
    element: document.querySelector(
      INVESTMENTS_ELEMENT_TAG,
    ) as FakeInvestmentsElement,
  };
}

describe('Inversiones (host del microfrontend)', () => {
  afterEach(() => tokenStore.clear());

  it('entrega getAccessToken como propiedad JS, nunca como atributo del DOM', async () => {
    tokenStore.set('token-en-memoria', 300);
    const { element } = await renderInvestments();

    expect(element.getAttribute('getaccesstoken')).toBeNull();
    expect(element.outerHTML).not.toContain('token-en-memoria');
    await expect(element.getAccessToken?.()).resolves.toBe('token-en-memoria');
    expect(element.apiBaseUrl).toBe('/api');
  });

  it('navega cuando el remote emite investments:navigate', async () => {
    const { element } = await renderInvestments();
    element.dispatchEvent(
      new CustomEvent(INVESTMENTS_EVENTS.navigate, {
        detail: { to: '/app/transferir' },
        bubbles: true,
        composed: true,
      }),
    );
    expect(
      await screen.findByRole('heading', { name: 'Pantalla de transferencia' }),
    ).toBeInTheDocument();
  });

  it('muestra los errores del remote como aviso global', async () => {
    const { element, store } = await renderInvestments();
    element.dispatchEvent(
      new CustomEvent(INVESTMENTS_EVENTS.error, {
        detail: { kind: 'network', message: 'Sin conexión con el portafolio' },
        bubbles: true,
        composed: true,
      }),
    );
    expect(store.getState().ui.notices[0]).toMatchObject({
      message: 'Sin conexión con el portafolio',
      severity: 'error',
    });
  });
});
