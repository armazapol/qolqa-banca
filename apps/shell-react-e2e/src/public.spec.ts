import { FX } from '../support/config.mjs';
import { expect, test } from './fixtures';

test.describe('Páginas públicas', () => {
  test('la portada es estática, accesible y con su CSP por hashes @movil', async ({
    page,
    expectAccessible,
  }) => {
    const response = await page.goto('/');
    expect(response?.headers()['content-security-policy']).toMatch(
      /script-src 'self' 'sha256-/,
    );
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      /Guarda, mueve y haz crecer/,
    );
    await expect(page).toHaveTitle(/Qolqa Banca Digital/);
    await expectAccessible();
  });

  test('el tipo de cambio llega renderizado en el servidor con caché de CDN', async ({
    page,
    request,
    expectAccessible,
  }) => {
    // El HTML del servidor ya trae el dato (SEO), antes de ejecutar JavaScript.
    const ssr = await request.get('/tipo-de-cambio');
    expect(ssr.headers()['cache-control']).toContain('s-maxage=300');
    expect(await ssr.text()).toContain(FX.sell.toFixed(3));

    await page.goto('/tipo-de-cambio');
    await expect(page).toHaveTitle(new RegExp(`S/ ${FX.sell.toFixed(3)}`));
    const official = page.getByRole('region', { name: /Oficial BCRP/ });
    await expect(official).toContainText(FX.date);
    await expect(official).toContainText(FX.buy.toFixed(3));
    await expect(page.getByText('En vivo').first()).toBeVisible();
    await expectAccessible();
  });

  test('una ruta inexistente responde 404 real', async ({ page }) => {
    const response = await page.goto('/no-existe');
    expect(response?.status()).toBe(404);
    await expect(
      page.getByRole('heading', { name: 'Página no encontrada' }),
    ).toBeVisible();
  });
});

test.describe('Consentimiento de cookies (Ley 29733)', () => {
  test('al rechazar no se descarga Google Analytics', async ({ page }) => {
    const gaRequests: string[] = [];
    page.on(
      'request',
      (request) =>
        request.url().includes('googletagmanager') &&
        gaRequests.push(request.url()),
    );

    await page.goto('/');
    await page.getByRole('button', { name: 'Rechazar' }).click();
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    expect(gaRequests).toEqual([]);
    await expect(page.getByRole('button', { name: 'Aceptar' })).toHaveCount(0);
  });

  test('al aceptar se carga gtag.js, permitido por la CSP', async ({
    page,
  }) => {
    await page.goto('/');
    const gtag = page.waitForRequest(
      /googletagmanager\.com\/gtag\/js\?id=G-E2ETEST01/,
    );
    await page.getByRole('button', { name: 'Aceptar' }).click();
    expect((await gtag).url()).toContain('id=G-E2ETEST01');
    await expect(page.getByRole('button', { name: 'Aceptar' })).toHaveCount(0);
  });

  test('la decisión se puede cambiar desde la política de cookies', async ({
    page,
  }) => {
    await page.goto('/legal/cookies');
    await page.getByRole('button', { name: 'Rechazar' }).click();
    await page.getByRole('button', { name: 'Cambiar mi decisión' }).click();
    await expect(page.getByRole('button', { name: 'Aceptar' })).toBeVisible();
  });
});
