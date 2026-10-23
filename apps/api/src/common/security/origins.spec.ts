import { createOriginMatcher } from './origins';

describe('createOriginMatcher', () => {
  const allowed = createOriginMatcher(
    'https://qolqa-banca.vercel.app',
    'https://qolqa-banca-*-equipo.vercel.app',
  );

  it('admite producción y los previews del proyecto', () => {
    expect(allowed('https://qolqa-banca.vercel.app')).toBe(true);
    expect(allowed('https://qolqa-banca-abc123-equipo.vercel.app')).toBe(true);
    expect(allowed('https://qolqa-banca-git-fase-6-equipo.vercel.app')).toBe(
      true,
    );
  });

  it('rechaza otros dominios aunque se parezcan', () => {
    expect(allowed(undefined)).toBe(false);
    expect(allowed('http://qolqa-banca.vercel.app')).toBe(false);
    expect(allowed('https://qolqa-banca-x-equipo.vercel.app.evil.com')).toBe(
      false,
    );
    expect(allowed('https://qolqa-banca-x.evil.com-equipo.vercel.app')).toBe(
      false,
    );
    expect(allowed('https://otro-abc-equipo.vercel.app')).toBe(false);
  });

  it('sin patrón de previews solo admite producción', () => {
    const onlyProd = createOriginMatcher('https://qolqa-banca.vercel.app');
    expect(onlyProd('https://qolqa-banca-abc-equipo.vercel.app')).toBe(false);
  });

  it('exige un único comodín en el patrón', () => {
    expect(() =>
      createOriginMatcher('https://a.app', 'https://*-*.app'),
    ).toThrow();
  });
});
