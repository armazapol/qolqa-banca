import { startOfLimaDay } from './time';

describe('startOfLimaDay', () => {
  it('a las 23:00 de Lima (04:00 UTC del día siguiente) sigue siendo el mismo día', () => {
    expect(startOfLimaDay(new Date('2026-10-22T04:00:00Z')).toISOString()).toBe(
      '2026-10-21T05:00:00.000Z',
    );
  });

  it('a las 00:30 de Lima empieza un nuevo día', () => {
    expect(startOfLimaDay(new Date('2026-10-22T05:30:00Z')).toISOString()).toBe(
      '2026-10-22T05:00:00.000Z',
    );
  });
});
