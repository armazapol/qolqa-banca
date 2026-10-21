import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { ConsentBanner } from '../../app/components/ConsentBanner';
import { renderRoute } from '../render';

function renderBanner() {
  process.env['VITE_GA_MEASUREMENT_ID'] = 'G-TEST123';
  return renderRoute(ConsentBanner);
}

describe('ConsentBanner', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.head
      .querySelectorAll('script[src*="googletagmanager"]')
      .forEach((script) => script.remove());
  });
  afterAll(() => delete process.env['VITE_GA_MEASUREMENT_ID']);

  it('pregunta si no hay decisión y "Rechazar" no carga Google Analytics', async () => {
    const user = userEvent.setup();
    const { store } = renderBanner();

    await user.click(await screen.findByRole('button', { name: 'Rechazar' }));

    expect(store.getState().consent.analytics).toBe('denied');
    expect(
      document.querySelector('script[src*="googletagmanager"]'),
    ).toBeNull();
    expect(
      JSON.parse(window.localStorage.getItem('qolqa:consent') ?? '{}'),
    ).toMatchObject({
      analytics: 'denied',
    });
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Rechazar' })).toBeNull(),
    );
  });

  it('no vuelve a preguntar si ya hay una decisión vigente', async () => {
    window.localStorage.setItem(
      'qolqa:consent',
      JSON.stringify({ analytics: 'denied', decidedAt: Date.now() }),
    );
    const { store } = renderBanner();
    await waitFor(() =>
      expect(store.getState().consent.analytics).toBe('denied'),
    );
    expect(screen.queryByRole('button', { name: 'Aceptar' })).toBeNull();
  });

  it('no tiene violaciones de accesibilidad detectables (axe)', async () => {
    const { container } = renderBanner();
    await screen.findByRole('button', { name: 'Aceptar' });
    expect(await axe(container)).toHaveNoViolations();
  });
});
