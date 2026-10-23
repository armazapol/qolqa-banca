import { generate } from 'otplib';
import { expect, test } from './fixtures';

test.describe('Seguridad de la sesión', () => {
  test('el área privada sin sesión redirige al ingreso conservando el destino', async ({
    page,
  }) => {
    await page.goto('/app/transferir');
    await expect(page).toHaveURL(/\/ingresar\?redirigir=%2Fapp%2Ftransferir/);
  });

  test('una contraseña incorrecta muestra un mensaje genérico (sin enumeración)', async ({
    page,
    bankUser,
  }) => {
    await page.goto('/ingresar');
    await page.getByLabel('Correo electrónico').fill(bankUser.email);
    await page.getByLabel('Contraseña', { exact: true }).fill('Incorrecta123');
    await page.getByRole('button', { name: 'Continuar' }).click();
    await expect(page.getByRole('alert')).toContainText(
      'Credenciales inválidas',
    );

    // Mismo mensaje para un usuario que no existe.
    await page.getByLabel('Correo electrónico').fill('no-existe@demo.qolqa.pe');
    await page.getByRole('button', { name: 'Continuar' }).click();
    await expect(page.getByRole('alert')).toContainText(
      'Credenciales inválidas',
    );
  });

  test('el documento de ingreso lleva CSP con nonce y cabeceras de seguridad', async ({
    request,
  }) => {
    const first = await request.get('/ingresar');
    const second = await request.get('/ingresar');
    const nonceOf = (csp: string | undefined) =>
      csp?.match(/'nonce-([^']+)'/)?.[1];
    const csp = first.headers()['content-security-policy'];

    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);
    expect(nonceOf(csp)).toBeTruthy();
    // Un nonce nuevo en cada petición.
    expect(nonceOf(second.headers()['content-security-policy'])).not.toBe(
      nonceOf(csp),
    );
    expect(first.headers()['x-content-type-options']).toBe('nosniff');

    // blob: (módulos de es-module-shims para el microfrontend) solo en el área privada.
    expect(csp).toMatch(/script-src[^;]*blob:/);
    const publicCsp = (await request.get('/tipo-de-cambio')).headers()[
      'content-security-policy'
    ];
    expect(publicCsp).not.toContain('blob:');
  });

  test('un código TOTP ya usado en el login no sirve para transferir', async ({
    page,
    bankUser,
    password,
  }) => {
    await page.goto('/ingresar');
    await page.getByLabel('Correo electrónico').fill(bankUser.email);
    await page.getByLabel('Contraseña', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Continuar' }).click();
    const code = await generate({ secret: bankUser.totpSecret });
    await page.getByLabel('Código de verificación').fill(code);
    await page.getByRole('button', { name: 'Verificar e ingresar' }).click();
    await expect(page).toHaveURL(/\/app$/);

    const [origin] = bankUser.accounts;
    await page.goto('/app/transferir');
    await page.getByRole('combobox', { name: 'Cuenta de origen' }).click();
    await page.getByRole('option', { name: new RegExp(origin.alias) }).click();
    await page
      .getByLabel('Cuenta de destino (14 dígitos)')
      .fill(bankUser.accounts[2].number);
    await page.getByLabel('Importe').fill('1.00');
    await page.getByRole('button', { name: 'Continuar' }).click();
    await page.getByLabel('Código de verificación').fill(code);
    await page.getByRole('button', { name: 'Confirmar transferencia' }).click();

    await expect(page.getByRole('alert')).toContainText(
      'inválido o ya utilizado',
    );
  });

  test('al recargar, la sesión se recupera con la cookie httpOnly', async ({
    page,
    bankUser,
    login,
  }) => {
    await login(bankUser);
    // El access token vive solo en memoria: no está en ningún almacenamiento del navegador.
    const stored = await page.evaluate(
      () =>
        JSON.stringify({ ...localStorage }) +
        JSON.stringify({ ...sessionStorage }),
    );
    expect(stored).not.toMatch(/eyJ/);

    await page.reload();
    await expect(
      page.getByRole('heading', { name: /Hola, Usuario/ }),
    ).toBeVisible();
  });

  test('cerrar sesión revoca el acceso', async ({ page, bankUser, login }) => {
    await login(bankUser);
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(
      page.getByText('Cerraste sesión correctamente.'),
    ).toBeVisible();

    await page.goto('/app');
    await expect(page).toHaveURL(/\/ingresar/);
  });
});
