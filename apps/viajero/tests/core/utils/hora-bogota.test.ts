import { hoyBogota } from '@/core/utils/hora-bogota';
import { fechaLocal, fechaToIso, fechaUtc } from '@/core/utils/fechas';

/** «Hoy» para el servidor es la fecha de Bogotá (UTC-5 todo el año), no la del reloj del teléfono. */
describe('hoyBogota', () => {
  test('a las 21:00 en Bogotá (02:00 UTC del día siguiente) sigue siendo la fecha de Bogotá', () => {
    expect(hoyBogota(fechaUtc(2026, 11, 3, 2, 0))).toEqual(fechaLocal(2026, 11, 2));
  });

  test('hasta las 23:59 Bogotá es el mismo día; a las 00:00 Bogotá (05:00 UTC) cambia', () => {
    expect(hoyBogota(fechaUtc(2026, 11, 3, 4, 59))).toEqual(fechaLocal(2026, 11, 2));
    expect(hoyBogota(fechaUtc(2026, 11, 3, 5, 0))).toEqual(fechaLocal(2026, 11, 3));
  });

  test('a media mañana UTC es el mismo día', () => {
    expect(hoyBogota(fechaUtc(2026, 11, 2, 15, 0))).toEqual(fechaLocal(2026, 11, 2));
  });

  test('da lo mismo si el instante llega en UTC o en hora local', () => {
    // En JS un Date es un instante: «toLocal» no existe, pero el mismo instante armado desde los
    // campos locales debe dar la misma fecha.
    const utc = fechaUtc(2026, 11, 3, 2, 0);
    const local = fechaLocal(
      utc.getFullYear(),
      utc.getMonth() + 1,
      utc.getDate(),
      utc.getHours(),
      utc.getMinutes(),
    );
    expect(hoyBogota(local)).toEqual(hoyBogota(utc));
  });

  test('sin argumento usa el reloj real y se puede escribir como YYYY-MM-DD', () => {
    const esperado = new Date(Date.now() - 5 * 3600_000);
    expect(hoyBogota()).toEqual(
      fechaLocal(esperado.getUTCFullYear(), esperado.getUTCMonth() + 1, esperado.getUTCDate()),
    );
    expect(fechaToIso(fechaLocal(2026, 11, 2))).toBe('2026-11-02');
  });
});
