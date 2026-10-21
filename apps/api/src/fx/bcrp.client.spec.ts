import { extractJson, parseBcrpResponse } from './bcrp.client';

describe('extractJson', () => {
  it('ignora el aviso PHP en HTML que el BCRP añade tras el JSON', () => {
    const raw =
      '{"periods":[{"name":"19.Oct.26","values":["3.434","3.447"]}]}<br />\n<font size=\'1\'><table class=\'xdebug-error\'>Notice: Undefined offset</table></font>';
    expect(extractJson(raw)).toEqual({
      periods: [{ name: '19.Oct.26', values: ['3.434', '3.447'] }],
    });
  });

  it('funciona con un JSON limpio', () => {
    expect(extractJson('{"periods":[]}\n')).toEqual({ periods: [] });
  });
});

describe('parseBcrpResponse', () => {
  it('convierte los periodos del BCRP y descarta días sin dato (n.d.)', () => {
    const body = {
      config: { title: 'Tipo de cambio' },
      periods: [
        { name: '16.Oct.26', values: ['3.423', '3.431'] },
        { name: '19.Oct.26', values: ['3.434', '3.447'] },
        { name: '20.Oct.26', values: ['n.d.', 'n.d.'] },
        { name: '02.Ene.27', values: ['3.5', '3.51'] },
      ],
    };

    expect(parseBcrpResponse(body)).toEqual([
      { date: '2026-10-16', buy: 3.423, sell: 3.431 },
      { date: '2026-10-19', buy: 3.434, sell: 3.447 },
      { date: '2027-01-02', buy: 3.5, sell: 3.51 },
    ]);
  });

  it('rechaza una respuesta con forma inesperada', () => {
    expect(() =>
      parseBcrpResponse({ error: 'servicio no disponible' }),
    ).toThrow();
  });
});
