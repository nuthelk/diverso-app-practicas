import { todayInBogota } from '@/core/utils/bogota-time';
import { localDate, dateToIso, utcDate } from '@/core/utils/dates';

/** «Hoy» para el servidor es la fecha de Bogotá (UTC-5 todo el año), no la del reloj del teléfono. */
describe('hoyBogota', () => {
  test('a las 21:00 en Bogotá (02:00 UTC del día siguiente) sigue siendo la fecha de Bogotá', () => {
    expect(todayInBogota(utcDate(2026, 11, 3, 2, 0))).toEqual(localDate(2026, 11, 2));
  });

  test('hasta las 23:59 Bogotá es el mismo día; a las 00:00 Bogotá (05:00 UTC) cambia', () => {
    expect(todayInBogota(utcDate(2026, 11, 3, 4, 59))).toEqual(localDate(2026, 11, 2));
    expect(todayInBogota(utcDate(2026, 11, 3, 5, 0))).toEqual(localDate(2026, 11, 3));
  });

  test('a media mañana UTC es el mismo día', () => {
    expect(todayInBogota(utcDate(2026, 11, 2, 15, 0))).toEqual(localDate(2026, 11, 2));
  });

  test('da lo mismo si el instante llega en UTC o en hora local', () => {
    // En JS un Date es un instante: «toLocal» no existe, pero el mismo instante armado desde los
    // campos locales debe dar la misma fecha.
    const utc = utcDate(2026, 11, 3, 2, 0);
    const local = localDate(
      utc.getFullYear(),
      utc.getMonth() + 1,
      utc.getDate(),
      utc.getHours(),
      utc.getMinutes(),
    );
    expect(todayInBogota(local)).toEqual(todayInBogota(utc));
  });

  test('sin argumento usa el reloj real y se puede escribir como YYYY-MM-DD', () => {
    const expected = new Date(Date.now() - 5 * 3600_000);
    expect(todayInBogota()).toEqual(
      localDate(expected.getUTCFullYear(), expected.getUTCMonth() + 1, expected.getUTCDate()),
    );
    expect(dateToIso(localDate(2026, 11, 2))).toBe('2026-11-02');
  });
});
