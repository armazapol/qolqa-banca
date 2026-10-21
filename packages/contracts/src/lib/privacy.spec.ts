import { redactSensitive, stripQuery } from './privacy.js';

describe('redactSensitive', () => {
  it.each([
    [
      'token JWT',
      'falló con eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abc-123_x',
      'falló con [JWT]',
    ],
    [
      'cabecera Bearer',
      'Authorization: Bearer abc.def',
      'Authorization: Bearer [REDACTED]',
    ],
    [
      'correo',
      'usuario lucia.quispe@demo.qolqa.pe no encontrado',
      'usuario [EMAIL] no encontrado',
    ],
    [
      'cuenta de 14 dígitos',
      'cuenta 77701213233332 sin saldo',
      'cuenta [NUMERO] sin saldo',
    ],
    ['tarjeta con espacios', 'PAN 4111 1111 1111 1111', 'PAN [NUMERO]'],
    ['DNI', 'DNI 70123456', 'DNI [DNI]'],
  ])('oculta %s', (_, input, expected) => {
    expect(redactSensitive(input)).toBe(expected);
  });

  it('no altera importes ni fechas', () => {
    expect(
      redactSensitive('Saldo insuficiente para S/ 1,250.50 el 2026-10-21'),
    ).toBe('Saldo insuficiente para S/ 1,250.50 el 2026-10-21');
  });
});

describe('stripQuery', () => {
  it('elimina la query string y el fragmento', () => {
    expect(stripQuery('/ingresar?redirigir=%2Fapp#x')).toBe('/ingresar');
    expect(stripQuery('/app')).toBe('/app');
  });
});
