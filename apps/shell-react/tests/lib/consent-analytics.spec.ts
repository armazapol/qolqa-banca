import { toRoutePath } from '../../app/components/AnalyticsTracker';
import {
  CONSENT_TTL_MS,
  readConsent,
  writeConsent,
} from '../../app/lib/consent';

describe('almacenamiento del consentimiento', () => {
  beforeEach(() => window.localStorage.clear());

  it('guarda y lee la decisión', () => {
    writeConsent('granted');
    expect(readConsent()).toBe('granted');
  });

  it('caduca a los 12 meses y se vuelve a preguntar', () => {
    const decidedAt = Date.now();
    writeConsent('granted', decidedAt);
    expect(readConsent(decidedAt + CONSENT_TTL_MS - 1)).toBe('granted');
    expect(readConsent(decidedAt + CONSENT_TTL_MS)).toBeNull();
  });

  it('un valor corrupto equivale a no haber decidido', () => {
    window.localStorage.setItem('qolqa:consent', '{"analytics":"quizas"');
    expect(readConsent()).toBeNull();
  });
});

describe('GA4 (Consent Mode básico)', () => {
  const loadAnalytics = () => {
    let analytics!: typeof import('../../app/lib/analytics');
    jest.isolateModules(() => {
      analytics = require('../../app/lib/analytics');
    });
    return analytics;
  };
  const gaScript = () =>
    document.querySelector('script[src*="googletagmanager.com/gtag/js"]');

  beforeEach(() => {
    process.env['VITE_GA_MEASUREMENT_ID'] = 'G-TEST123';
    document.head.innerHTML = '';
    delete window.gtag;
    delete window.dataLayer;
  });
  afterAll(() => delete process.env['VITE_GA_MEASUREMENT_ID']);

  it('no descarga gtag.js ni envía eventos sin consentimiento', () => {
    const analytics = loadAnalytics();
    analytics.trackEvent('login', { method: 'totp' });
    expect(gaScript()).toBeNull();
    expect(window.dataLayer).toBeUndefined();
  });

  it('al aceptar carga gtag.js con publicidad denegada y señales de Google desactivadas', () => {
    const analytics = loadAnalytics();
    analytics.grantAnalytics();

    expect(gaScript()).not.toBeNull();
    const calls = (window.dataLayer ?? []).map((args) =>
      Array.from(args as ArrayLike<unknown>),
    );
    expect(calls).toContainEqual([
      'consent',
      'default',
      expect.objectContaining({
        ad_storage: 'denied',
        ad_user_data: 'denied',
        analytics_storage: 'denied',
      }),
    ]);
    expect(calls).toContainEqual([
      'consent',
      'update',
      { analytics_storage: 'granted' },
    ]);
    expect(calls).toContainEqual([
      'config',
      'G-TEST123',
      expect.objectContaining({
        allow_google_signals: false,
        send_page_view: false,
      }),
    ]);
  });

  it('al revocar deja de enviar eventos', () => {
    const analytics = loadAnalytics();
    analytics.grantAnalytics();
    analytics.denyAnalytics();
    const before = window.dataLayer?.length;
    analytics.trackEvent('login');
    expect(window.dataLayer?.length).toBe(before);
  });

  it('sin ID de medición no hace nada', () => {
    delete process.env['VITE_GA_MEASUREMENT_ID'];
    const analytics = loadAnalytics();
    analytics.grantAnalytics();
    expect(gaScript()).toBeNull();
    expect(analytics.isAnalyticsConfigured()).toBe(false);
  });
});

describe('toRoutePath (page_view sin identificadores)', () => {
  it('sustituye los parámetros por su nombre', () => {
    expect(
      toRoutePath('/app/movimientos/7f1b0e9a-2c4d-4e5f-8a9b-0c1d2e3f4a5b', {
        accountId: '7f1b0e9a-2c4d-4e5f-8a9b-0c1d2e3f4a5b',
      }),
    ).toBe('/app/movimientos/:accountId');
  });
});
