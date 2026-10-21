import { expect, test } from './fixtures';

test.describe('Inactividad y PWA', () => {
  test('cierra la sesión tras 5 minutos sin actividad, con aviso previo', async ({
    page,
    bankUser,
    login,
  }) => {
    // Reloj simulado: no hay que esperar 5 minutos reales.
    await page.clock.install();
    await login(bankUser);

    await page.clock.runFor('04:01');
    const dialog = page.getByRole('alertdialog', { name: '¿Sigues ahí?' });
    await expect(dialog).toBeVisible();

    await page.clock.runFor('01:00');
    await expect(page).toHaveURL(/\/ingresar/);
    await expect(
      page.getByText(/Cerramos tu sesión por inactividad/),
    ).toBeVisible();
  });

  test('"Seguir conectado" mantiene la sesión', async ({
    page,
    bankUser,
    login,
  }) => {
    await page.clock.install();
    await login(bankUser);
    await page.clock.runFor('04:01');
    await page.getByRole('button', { name: 'Seguir conectado' }).click();
    await page.clock.runFor('02:00');
    await expect(page).toHaveURL(/\/app$/);
  });

  test('sin conexión: las páginas públicas siguen disponibles y el área privada no usa caché', async ({
    page,
    context,
    browserName,
  }) => {
    test.skip(
      browserName !== 'chromium',
      'El modo offline del service worker se valida en Chromium',
    );

    await page.goto('/');
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.reload(); // la portada pasa por el service worker y queda en caché

    await context.setOffline(true);
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Guarda, mueve',
    );

    await page.goto('/app');
    await expect(
      page.getByText(/solo funciona con conexión a internet/),
    ).toBeVisible();
    await context.setOffline(false);
  });
});
