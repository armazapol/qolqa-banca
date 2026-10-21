import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

/**
 * Los handlers interceptan a nivel de red (ADR-0008): el código bajo prueba
 * hace fetch reales, sin mocks del cliente HTTP.
 */
export const BASE = 'http://localhost';
export const api = (path: string) => `${BASE}/api${path}`;

export const session = {
  accessToken: 'access-token-1',
  expiresIn: 300,
  user: {
    id: 'user-1',
    fullName: 'Lucía Quispe Mamani',
    email: 'lucia.quispe@demo.qolqa.pe',
  },
};

export const dashboard = {
  profile: {
    fullName: 'Lucía Quispe Mamani',
    dailyLimitPenCents: 1_000_000,
    dailyLimitUsdCents: 300_000,
  },
  accountsList: [
    {
      id: '7f1b0e9a-2c4d-4e5f-8a9b-0c1d2e3f4a5b',
      type: 'CHECKING',
      currency: 'PEN',
      alias: 'Cuenta Sueldo',
      numberMasked: '****8901',
      balanceCents: 1_051_420,
    },
  ],
  cards: [],
};

export const server = setupServer(
  http.get(api('/auth/csrf'), () => HttpResponse.json({ csrfToken: 'csrf-1' })),
  http.post(api('/graphql'), () => HttpResponse.json({ data: dashboard })),
);
