import { buildCsp } from '../../app/lib/csp/policy';

const directive = (csp: string, name: string) =>
  csp
    .split('; ')
    .find((part) => part.startsWith(`${name} `))
    ?.split(' ')
    .slice(1) ?? [];

const base = {
  scriptTokens: ["'nonce-abc'"],
  analytics: false,
  upgradeInsecure: true,
};

describe('buildCsp', () => {
  it('no permite scripts inline sin nonce ni eval', () => {
    const scripts = directive(buildCsp(base), 'script-src');
    expect(scripts).toEqual(["'self'", "'nonce-abc'"]);
    expect(scripts).not.toContain("'unsafe-inline'");
    expect(scripts).not.toContain("'unsafe-eval'");
  });

  it('impide embeber la banca en otros sitios y bloquea plugins', () => {
    const csp = buildCsp(base);
    expect(directive(csp, 'frame-ancestors')).toEqual(["'none'"]);
    expect(directive(csp, 'object-src')).toEqual(["'none'"]);
    expect(directive(csp, 'base-uri')).toEqual(["'self'"]);
    expect(csp).toContain('upgrade-insecure-requests');
  });

  it('solo abre los dominios de Google Analytics si GA4 está configurado', () => {
    expect(buildCsp(base)).not.toContain('google');
    const csp = buildCsp({ ...base, analytics: true });
    expect(directive(csp, 'script-src')).toContain(
      'https://www.googletagmanager.com',
    );
    expect(directive(csp, 'connect-src')).toContain(
      'https://*.google-analytics.com',
    );
  });

  it('permite el WebSocket del BFF (wss) y el origen de Sentry, sin la ruta del DSN', () => {
    const connect = directive(
      buildCsp({
        ...base,
        wsOrigin: 'https://api.qolqa.pe',
        sentryDsn: 'https://clave@o123.ingest.sentry.io/456',
      }),
      'connect-src',
    );
    expect(connect).toEqual(
      expect.arrayContaining([
        "'self'",
        'wss://api.qolqa.pe',
        'wss://data-stream.binance.vision',
        'https://o123.ingest.sentry.io',
      ]),
    );
    expect(connect.join(' ')).not.toContain('clave');
  });
});
