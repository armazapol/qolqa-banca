import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { http, HttpResponse } from 'msw';
import Transferir from '../../app/routes/app/transferir';
import { api, dashboard, server } from '../msw';
import { renderRoute } from '../render';

const account = dashboard.accountsList[0];

async function fillDetails(
  user: ReturnType<typeof userEvent.setup>,
  amount: string,
) {
  await user.click(
    await screen.findByRole('combobox', { name: 'Cuenta de origen' }),
  );
  await user.click(
    await screen.findByRole('option', { name: /Cuenta Sueldo/ }),
  );
  await user.type(
    screen.getByLabelText('Cuenta de destino (14 dígitos)'),
    '77701213233332',
  );
  await user.type(screen.getByLabelText('Importe'), amount);
  await user.click(screen.getByRole('button', { name: 'Continuar' }));
}

describe('Transferir', () => {
  it('valida cuenta e importe con los mismos esquemas que el BFF', async () => {
    const user = userEvent.setup();
    renderRoute(Transferir);

    await user.type(
      await screen.findByLabelText('Cuenta de destino (14 dígitos)'),
      '123',
    );
    await user.type(screen.getByLabelText('Importe'), '10.555');
    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(
      await screen.findByText('El número de cuenta debe tener 14 dígitos'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Ingresa un importe válido (máximo 2 decimales)'),
    ).toBeInTheDocument();
  });

  it('no permite transferir más que el saldo disponible', async () => {
    const user = userEvent.setup();
    renderRoute(Transferir);
    await fillDetails(user, '20000');
    expect(
      await screen.findByText('El importe supera tu saldo disponible'),
    ).toBeInTheDocument();
  });

  it('revisa, confirma con OTP e Idempotency-Key, y muestra la constancia', async () => {
    const user = userEvent.setup();
    let request: { headers: Headers; body: unknown } | undefined;
    server.use(
      http.post(api('/transfers'), async ({ request: req }) => {
        request = { headers: req.headers, body: await req.json() };
        return HttpResponse.json(
          {
            id: 'a1b2c3d4-0000-4000-8000-000000000000',
            status: 'COMPLETED',
            amountCents: 2550,
            currency: 'PEN',
            toAccountNumberMasked: '****3332',
            createdAt: '2026-10-21T16:36:01.043Z',
          },
          { status: 201 },
        );
      }),
    );
    renderRoute(Transferir);

    await fillDetails(user, '25.50');
    expect(
      await screen.findByRole('heading', { name: 'Confirma la operación' }),
    ).toHaveFocus();
    expect(screen.getByText('S/ 25.50')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Código de verificación'), '654321');
    await user.click(
      screen.getByRole('button', { name: 'Confirmar transferencia' }),
    );

    const heading = await screen.findByRole('heading', {
      name: 'Transferencia realizada',
    });
    expect(heading).toBeInTheDocument();
    expect(screen.getByText(/A1B2C3D4/)).toBeInTheDocument();
    expect(request?.body).toEqual({
      fromAccountId: account.id,
      toAccountNumber: '77701213233332',
      amount: '25.50',
      description: '',
      otp: '654321',
    });
    expect(request?.headers.get('idempotency-key')).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('si el OTP es rechazado (403) muestra el error y permite reintentar', async () => {
    const user = userEvent.setup();
    server.use(
      http.post(api('/transfers'), () =>
        HttpResponse.json(
          { message: 'Código de verificación inválido o ya utilizado' },
          { status: 403 },
        ),
      ),
    );
    renderRoute(Transferir);

    await fillDetails(user, '10');
    await user.type(
      await screen.findByLabelText('Código de verificación'),
      '000000',
    );
    await user.click(
      screen.getByRole('button', { name: 'Confirmar transferencia' }),
    );

    const alert = await screen.findByRole('alert');
    expect(
      within(alert).getByText(/Código de verificación inválido/),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Código de verificación')).toHaveValue('');
  });

  it('no tiene violaciones de accesibilidad detectables (axe)', async () => {
    const { container } = renderRoute(Transferir);
    await screen.findByLabelText('Importe');
    expect(await axe(container)).toHaveNoViolations();
  });
});
