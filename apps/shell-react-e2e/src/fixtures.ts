/* eslint-disable no-empty-pattern -- Playwright exige desestructurar el primer argumento de un fixture aunque no use otros. */
import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test as base } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { generate } from 'otplib';
import { E2E_USERS_FILE, PORTS } from '../support/config.mjs';

export interface E2eAccount {
  alias: string;
  currency: 'PEN' | 'USD';
  number: string;
  balanceCents: number;
}

export interface E2eUser {
  email: string;
  totpSecret: string;
  accounts: E2eAccount[];
}

interface UsersFile {
  password: string;
  users: E2eUser[];
}

const usersFile = (): UsersFile =>
  JSON.parse(readFileSync(E2E_USERS_FILE, 'utf8')) as UsersFile;

/** Pide al servidor de soporte un usuario que ningún otro test haya usado. */
export async function takeUser(): Promise<E2eUser> {
  const response = await fetch(
    `http://localhost:${PORTS.stub}/__e2e/next-user`,
  );
  const { index } = (await response.json()) as { index: number };
  const user = usersFile().users[index];
  if (!user) throw new Error('No quedan usuarios E2E: aumenta E2E_USER_COUNT');
  return user;
}

/**
 * Código TOTP válido. Cada código solo vale una vez (anti-replay del BFF): si
 * este usuario ya usó el paso actual, se espera al siguiente periodo de 30 s.
 */
const usedSteps = new Map<string, number>();
export async function totp(user: E2eUser): Promise<string> {
  let step = Math.floor(Date.now() / 30_000);
  if (usedSteps.get(user.email) === step) {
    await new Promise((resolve) =>
      setTimeout(resolve, 30_000 - (Date.now() % 30_000) + 500),
    );
    step = Math.floor(Date.now() / 30_000);
  }
  usedSteps.set(user.email, step);
  return generate({ secret: user.totpSecret });
}

/** Simula el WebSocket de Binance: precios estables y predecibles (ADR-0022). */
export const BINANCE_PRICES: Record<string, { price: number; open: number }> = {
  BTCUSDT: { price: 80_000, open: 78_000 },
  ETHUSDT: { price: 2_500, open: 2_550 },
  SOLUSDT: { price: 150, open: 145 },
};

async function mockExternalServices(page: Page): Promise<void> {
  await page.routeWebSocket(/data-stream\.binance\.vision/, (ws) => {
    const timer = setInterval(() => {
      for (const [symbol, { price, open }] of Object.entries(BINANCE_PRICES)) {
        ws.send(
          JSON.stringify({
            stream: `${symbol.toLowerCase()}@miniTicker`,
            data: { s: symbol, c: String(price), o: String(open) },
          }),
        );
      }
    }, 300);
    ws.onClose(() => clearInterval(timer));
  });
  // GA4: el script se sirve vacío y nada sale hacia Google durante las pruebas.
  await page.route(/googletagmanager\.com\/gtag\/js/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/javascript',
      body: '/* gtag simulado */',
    }),
  );
  await page.route(/google-analytics\.com|analytics\.google\.com/, (route) =>
    route.abort(),
  );
}

interface Fixtures {
  bankUser: E2eUser;
  password: string;
  login: (user: E2eUser) => Promise<void>;
  cspViolations: string[];
  expectAccessible: (options?: { include?: string }) => Promise<void>;
}

let ipCounter = 0;

export const test = base.extend<Fixtures>({
  /**
   * IP distinta por test (X-Forwarded-For, como haría Vercel): el límite de
   * 5 intentos/min de login es por IP y las pruebas corren en paralelo.
   */
  extraHTTPHeaders: async ({}, use, testInfo) => {
    ipCounter += 1;
    await use({
      'x-forwarded-for': `10.${testInfo.workerIndex % 250}.${Math.floor(ipCounter / 250)}.${ipCounter % 250}`,
    });
  },

  page: async ({ page }, use) => {
    await mockExternalServices(page);
    await use(page);
  },

  /** Violaciones de CSP del documento: todos los tests deben terminar con 0 (ADR-0021). */
  cspViolations: [
    async ({ page }, use) => {
      const violations: string[] = [];
      await page.exposeFunction('__reportCsp', (entry: string) =>
        violations.push(entry),
      );
      await page.addInitScript(() => {
        document.addEventListener('securitypolicyviolation', (event) => {
          (
            window as unknown as { __reportCsp: (entry: string) => void }
          ).__reportCsp(
            `${event.violatedDirective} → ${event.blockedURI || 'inline'} (${location.pathname})`,
          );
        });
      });
      await use(violations);
      expect(violations, 'Violaciones de la Content Security Policy').toEqual(
        [],
      );
    },
    { auto: true },
  ],

  bankUser: async ({}, use) => use(await takeUser()),
  password: async ({}, use) => use(usersFile().password),

  login: async ({ page, password }, use) => {
    await use(async (user) => {
      await page.goto('/ingresar');
      await page.getByLabel('Correo electrónico').fill(user.email);
      await page.getByLabel('Contraseña', { exact: true }).fill(password);
      await page.getByRole('button', { name: 'Continuar' }).click();
      await page.getByLabel('Código de verificación').fill(await totp(user));
      await page.getByRole('button', { name: 'Verificar e ingresar' }).click();
      await expect(page).toHaveURL(/\/app/);
    });
  },

  /** WCAG 2.2 AA con axe; falla ante violaciones graves o críticas (ADR-0022). */
  expectAccessible: async ({ page }, use) => {
    await use(async (options) => {
      // Se mide el estado final: axe no debe analizar a mitad de un fade-in o una transición.
      await page.waitForFunction(() =>
        document
          .getAnimations()
          .every((animation) => animation.playState !== 'running'),
      );
      // Motion anima con JavaScript (no aparece en getAnimations): sus transiciones duran ≤ 400 ms.
      await page.waitForTimeout(600);
      let builder = new AxeBuilder({ page }).withTags([
        'wcag2a',
        'wcag2aa',
        'wcag21a',
        'wcag21aa',
        'wcag22aa',
      ]);
      if (options?.include) builder = builder.include(options.include);
      const { violations } = await builder.analyze();
      const serious = violations.filter(
        (v) => v.impact === 'serious' || v.impact === 'critical',
      );
      expect(
        // Por cada violación: regla, selector y el motivo que da axe (p. ej. el ratio de contraste).
        serious.flatMap((v) =>
          v.nodes.map(
            (node) =>
              `${v.id}: ${node.target.join(' ')} → ${node.failureSummary?.split('\n').at(-1)?.trim()}`,
          ),
        ),
        'Violaciones de accesibilidad graves o críticas',
      ).toEqual([]);
    });
  },
});

export { expect };
