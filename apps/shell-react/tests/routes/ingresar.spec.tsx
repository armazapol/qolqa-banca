import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { http, HttpResponse } from 'msw';
import { tokenStore } from '../../app/lib/api/token-store';
import Ingresar from '../../app/routes/ingresar';
import { api, server, session } from '../msw';
import { renderRoute } from '../render';

function AppHome() {
  return <h1>Área privada</h1>;
}

function renderLogin(initialEntry = '/ingresar') {
  return renderRoute(Ingresar, {
    path: '/ingresar',
    initialEntry,
    extraRoutes: [
      { path: '/app', Component: AppHome },
      { path: '/app/transferir', Component: AppHome },
    ],
  });
}

describe('Ingresar', () => {
  afterEach(() => tokenStore.clear());

  it('valida el formulario antes de llamar al BFF', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.click(await screen.findByRole('button', { name: 'Continuar' }));

    expect(await screen.findByText('Correo no válido')).toBeInTheDocument();
    expect(screen.getByText('Mínimo 8 caracteres')).toBeInTheDocument();
  });

  it('completa el login en dos pasos y redirige a la ruta segura solicitada', async () => {
    const user = userEvent.setup();
    let otpBody: unknown;
    server.use(
      http.post(api('/auth/login'), () =>
        HttpResponse.json({ challengeToken: 'reto-1', expiresIn: 300 }),
      ),
      http.post(api('/auth/otp'), async ({ request }) => {
        otpBody = await request.json();
        return HttpResponse.json(session);
      }),
    );
    const { store } = renderLogin('/ingresar?redirigir=%2Fapp%2Ftransferir');

    await user.type(
      await screen.findByLabelText('Correo electrónico'),
      'lucia.quispe@demo.qolqa.pe',
    );
    await user.type(screen.getByLabelText('Contraseña'), 'Qolqa#Demo2026');
    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    await user.type(
      await screen.findByLabelText('Código de verificación'),
      '123456',
    );
    await user.click(
      screen.getByRole('button', { name: 'Verificar e ingresar' }),
    );

    expect(
      await screen.findByRole('heading', { name: 'Área privada' }),
    ).toBeInTheDocument();
    expect(otpBody).toEqual({ challengeToken: 'reto-1', code: '123456' });
    expect(tokenStore.get()).toBe(session.accessToken);
    expect(store.getState().session).toMatchObject({
      status: 'authenticated',
      user: session.user,
    });
  });

  it('muestra el mensaje genérico del BFF si las credenciales fallan', async () => {
    const user = userEvent.setup();
    server.use(
      http.post(api('/auth/login'), () =>
        HttpResponse.json(
          { message: 'Credenciales inválidas.' },
          { status: 401 },
        ),
      ),
    );
    renderLogin();

    await user.type(
      await screen.findByLabelText('Correo electrónico'),
      'lucia.quispe@demo.qolqa.pe',
    );
    await user.type(screen.getByLabelText('Contraseña'), 'Incorrecta123');
    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Credenciales inválidas.',
    );
  });

  it('explica por qué se cerró la sesión', async () => {
    renderRoute(Ingresar, {
      path: '/ingresar',
      preloadedState: {
        session: { status: 'anonymous', user: null, logoutReason: 'idle' },
      },
    });
    expect(await screen.findByText(/por inactividad/)).toBeInTheDocument();
  });

  it('no tiene violaciones de accesibilidad detectables (axe)', async () => {
    const { container } = renderLogin();
    await screen.findByLabelText('Correo electrónico');
    await waitFor(async () =>
      expect(await axe(container)).toHaveNoViolations(),
    );
  });
});
