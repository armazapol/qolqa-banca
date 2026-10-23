import type { Page } from '@playwright/test';
import {
  type E2eAccount,
  type E2eUser,
  expect,
  takeUser,
  test,
  totp,
} from './fixtures';

/** Mismo formato que la app: es-PE con "S/" y "US$". */
const money = (cents: number, currency: 'PEN' | 'USD') =>
  `${currency === 'PEN' ? 'S/' : 'US$'} ${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
const masked = (number: string) => `****${number.slice(-4)}`;

async function fillTransfer(
  page: Page,
  from: E2eAccount,
  to: E2eAccount,
  amount: string,
) {
  await page.goto('/app/transferir');
  await page.getByRole('combobox', { name: 'Cuenta de origen' }).click();
  await page.getByRole('option', { name: new RegExp(from.alias) }).click();
  await page.getByLabel('Cuenta de destino (14 dígitos)').fill(to.number);
  await page.getByLabel('Importe').fill(amount);
  await page.getByRole('button', { name: 'Continuar' }).click();
}

const penAccount = (user: E2eUser) =>
  user.accounts.find((a) => a.currency === 'PEN') as E2eAccount;

test.describe('Banca', () => {
  test('el resumen muestra cuentas enmascaradas y saldos @movil', async ({
    page,
    bankUser,
    login,
    expectAccessible,
  }) => {
    await login(bankUser);
    for (const account of bankUser.accounts) {
      await expect(
        page.getByText(money(account.balanceCents, account.currency)).first(),
      ).toBeVisible();
      await expect(
        page.getByText(masked(account.number)).first(),
      ).toBeVisible();
    }
    // El número completo nunca está en la página hasta pedirlo.
    await expect(page.locator('body')).not.toContainText(
      bankUser.accounts[0].number,
    );
    await expectAccessible();
  });

  test('revelar el número de cuenta lo muestra (acción auditada)', async ({
    page,
    bankUser,
    login,
  }) => {
    await login(bankUser);
    await page
      .getByRole('button', { name: 'Mostrar número de cuenta completo' })
      .first()
      .click();
    await expect(page.getByText(bankUser.accounts[0].number)).toBeVisible();
  });

  test('los movimientos se paginan por cursor', async ({
    page,
    bankUser,
    login,
  }) => {
    await login(bankUser);
    await page
      .getByRole('link', { name: /Ver movimientos de Cuenta Sueldo/ })
      .click();
    const rows = page.getByRole('table').getByRole('row');
    await expect(rows).toHaveCount(16); // encabezado + 15
    await page.getByRole('button', { name: 'Cargar más movimientos' }).click();
    await expect.poll(() => rows.count()).toBeGreaterThan(16);
  });

  test('la transferencia valida el saldo antes de pedir el código', async ({
    page,
    bankUser,
    login,
  }) => {
    await login(bankUser);
    const from = penAccount(bankUser);
    await fillTransfer(page, from, bankUser.accounts[2], '999999.00');
    await expect(
      page.getByText('El importe supera tu saldo disponible'),
    ).toBeVisible();
  });

  test('un código inválido muestra el error y permite reintentar', async ({
    page,
    bankUser,
    login,
  }) => {
    await login(bankUser);
    await fillTransfer(
      page,
      penAccount(bankUser),
      bankUser.accounts[2],
      '5.00',
    );
    await page.getByLabel('Código de verificación').fill('000000');
    await page.getByRole('button', { name: 'Confirmar transferencia' }).click();
    await expect(page.getByRole('alert')).toContainText(
      'Código de verificación inválido',
    );
    await expect(page.getByLabel('Código de verificación')).toHaveValue('');
  });

  test('transferencia completa: constancia, saldo y aviso en tiempo real al destinatario', async ({
    page,
    browser,
    bankUser,
    login,
    password,
  }) => {
    test.slow(); // dos códigos TOTP del mismo usuario: puede esperar al siguiente periodo de 30 s
    const receiver = await takeUser();

    // El destinatario, en otro navegador, con su banca abierta.
    const receiverContext = await browser.newContext({
      extraHTTPHeaders: { 'x-forwarded-for': '10.250.0.1' },
    });
    const receiverPage = await receiverContext.newPage();
    await receiverPage.goto('/ingresar');
    await receiverPage.getByLabel('Correo electrónico').fill(receiver.email);
    await receiverPage.getByLabel('Contraseña', { exact: true }).fill(password);
    await receiverPage.getByRole('button', { name: 'Continuar' }).click();
    await receiverPage
      .getByLabel('Código de verificación')
      .fill(await totp(receiver));
    await receiverPage
      .getByRole('button', { name: 'Verificar e ingresar' })
      .click();
    await expect(
      receiverPage.getByRole('heading', { name: /Hola/ }),
    ).toBeVisible();

    await login(bankUser);
    const from = penAccount(bankUser);
    const to = penAccount(receiver);
    await fillTransfer(page, from, to, '12.30');
    await expect(
      page.getByRole('heading', { name: 'Confirma la operación' }),
    ).toBeFocused();
    await page.getByLabel('Código de verificación').fill(await totp(bankUser));
    await page.getByRole('button', { name: 'Confirmar transferencia' }).click();

    await expect(
      page.getByRole('heading', { name: 'Transferencia realizada' }),
    ).toBeVisible();
    await expect(
      page.getByText(`enviados a la cuenta ${masked(to.number)}`),
    ).toBeVisible();
    await expect(
      page.getByText(
        `Transferencia de S/ 12.30 a la cuenta ${masked(to.number)} realizada.`,
      ),
    ).toBeVisible();
    await expect(
      receiverPage.getByText(
        `Recibiste S/ 12.30 en tu cuenta ${masked(to.number)}.`,
      ),
    ).toBeVisible();

    await page.getByRole('link', { name: 'Volver al resumen' }).click();
    await expect(
      page.getByText(money(from.balanceCents - 1230, 'PEN')).first(),
    ).toBeVisible();
    await receiverContext.close();
  });
});
