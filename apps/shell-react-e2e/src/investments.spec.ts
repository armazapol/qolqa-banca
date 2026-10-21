import { BINANCE_PRICES, expect, test } from './fixtures';

test.describe('Microfrontend Inversiones (Angular)', () => {
  test('se monta en Shadow DOM, sin Zone.js, con precios en vivo', async ({
    page,
    bankUser,
    login,
    expectAccessible,
  }) => {
    await login(bankUser);
    await page.getByRole('link', { name: 'Inversiones' }).first().click();

    const mf = page.locator('bank-investments');
    await expect(
      mf.getByRole('heading', { name: 'Mi portafolio' }),
    ).toBeVisible();
    await expect(mf.getByText('En vivo')).toBeVisible();
    expect(await mf.evaluate((el) => el.shadowRoot !== null)).toBe(true);
    expect(await page.evaluate(() => 'Zone' in window)).toBe(false);

    // 0.0125 BTC × US$ 80,000 (precio simulado) = US$ 1,000.00
    const btc = mf.getByRole('row', { name: /Bitcoin/ });
    await expect(btc).toContainText(
      `US$ ${BINANCE_PRICES.BTCUSDT.price.toLocaleString('en-US')}.00`,
    );
    await expect(btc).toContainText('US$ 1,000.00');
    await expect(btc).toContainText('+2.56%'); // (80,000 − 78,000) / 78,000

    // El token nunca se expone como atributo del elemento.
    const attributes = await mf.evaluate((el) =>
      el.getAttributeNames().join(' '),
    );
    expect(attributes).not.toMatch(/token/i);

    await expectAccessible({ include: 'bank-investments' });
  });

  test('el remote pide al shell navegar mediante eventos', async ({
    page,
    bankUser,
    login,
  }) => {
    await login(bankUser);
    await page.goto('/app/inversiones');
    await page
      .locator('bank-investments')
      .getByRole('button', { name: 'Transferir fondos' })
      .click();
    await expect(page).toHaveURL(/\/app\/transferir$/);
  });
});
