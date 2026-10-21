import { http, HttpResponse } from 'msw';
import { ApiError } from '../../app/lib/api/errors';
import { apiFetch } from '../../app/lib/api/http';
import { SESSION_EXPIRED_EVENT } from '../../app/lib/api/session';
import { tokenStore } from '../../app/lib/api/token-store';
import { api, server, session } from '../msw';

describe('apiFetch', () => {
  beforeEach(() => tokenStore.set('token-viejo', 300));
  afterEach(() => tokenStore.clear());

  it('envía el access token como Bearer', async () => {
    let authorization: string | null = null;
    server.use(
      http.get(api('/fx/quote'), ({ request }) => {
        authorization = request.headers.get('authorization');
        return HttpResponse.json({ ok: true });
      }),
    );
    await apiFetch('/api/fx/quote');
    expect(authorization).toBe('Bearer token-viejo');
  });

  it('ante un 401 renueva la sesión con CSRF y reintenta una sola vez', async () => {
    let refreshCsrfHeader: string | null = null;
    server.use(
      http.get(api('/protegido'), ({ request }) =>
        request.headers.get('authorization') === `Bearer ${session.accessToken}`
          ? HttpResponse.json({ saldo: 100 })
          : HttpResponse.json({ message: 'Token inválido' }, { status: 401 }),
      ),
      http.post(api('/auth/refresh'), ({ request }) => {
        refreshCsrfHeader = request.headers.get('x-csrf-token');
        return HttpResponse.json(session);
      }),
    );

    await expect(apiFetch('/api/protegido')).resolves.toEqual({ saldo: 100 });
    expect(refreshCsrfHeader).toBe('csrf-1');
    expect(tokenStore.get()).toBe(session.accessToken);
  });

  it('varias peticiones con 401 simultáneas comparten un único refresh', async () => {
    let refreshCalls = 0;
    server.use(
      http.get(api('/protegido'), ({ request }) =>
        request.headers.get('authorization') === `Bearer ${session.accessToken}`
          ? HttpResponse.json({ ok: true })
          : new HttpResponse(null, { status: 401 }),
      ),
      http.post(api('/auth/refresh'), () => {
        refreshCalls += 1;
        return HttpResponse.json(session);
      }),
    );

    await Promise.all([
      apiFetch('/api/protegido'),
      apiFetch('/api/protegido'),
      apiFetch('/api/protegido'),
    ]);
    expect(refreshCalls).toBe(1);
  });

  it('si el refresh falla, avisa que la sesión expiró', async () => {
    const onExpired = jest.fn();
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    server.use(
      http.get(
        api('/protegido'),
        () => new HttpResponse(null, { status: 401 }),
      ),
      http.post(
        api('/auth/refresh'),
        () => new HttpResponse(null, { status: 401 }),
      ),
    );

    await expect(apiFetch('/api/protegido')).rejects.toBeInstanceOf(ApiError);
    expect(onExpired).toHaveBeenCalledTimes(1);
    expect(tokenStore.get()).toBeNull();
    window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  });

  it('un 403 (OTP inválido en una operación) NO dispara el refresh', async () => {
    const refresh = jest.fn();
    server.use(
      http.post(api('/transfers'), () =>
        HttpResponse.json(
          { message: 'Código de verificación inválido o ya utilizado' },
          { status: 403 },
        ),
      ),
      http.post(api('/auth/refresh'), refresh),
    );

    await expect(
      apiFetch('/api/transfers', { method: 'POST', body: '{}' }),
    ).rejects.toMatchObject({
      status: 403,
      message: 'Código de verificación inválido o ya utilizado',
    });
    expect(refresh).not.toHaveBeenCalled();
  });

  it('traduce el 429 a un mensaje comprensible', async () => {
    server.use(
      http.post(
        api('/auth/login'),
        () => new HttpResponse(null, { status: 429 }),
      ),
    );
    await expect(
      apiFetch('/api/auth/login', { method: 'POST', body: '{}' }),
    ).rejects.toThrow(/Demasiados intentos/);
  });
});
