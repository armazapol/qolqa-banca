import { safeRedirect } from '../../app/lib/safe-redirect';

describe('safeRedirect (prevención de open redirect)', () => {
  it.each([
    ['/app/transferir', '/app/transferir'],
    ['/app/movimientos/abc?x=1', '/app/movimientos/abc?x=1'],
  ])('acepta la ruta interna %s', (input, expected) => {
    expect(safeRedirect(input)).toBe(expected);
  });

  it.each([
    [null],
    ['https://evil.com/app'],
    ['//evil.com/app'],
    ['/\\evil.com'],
    ['javascript:alert(1)'],
    ['/ingresar'],
    ['/app/../../evil'],
  ])('rechaza %s y vuelve a /app', (input) => {
    const result = safeRedirect(input);
    expect(result.startsWith('/app')).toBe(true);
    expect(result).not.toContain('evil.com');
  });
});
