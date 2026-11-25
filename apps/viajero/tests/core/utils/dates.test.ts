import {
  localDate,
  dateToIso,
  utcDate,
  tryParseDate,
  isSameDay,
  parseDate,
} from '@/core/utils/dates';

/**
 * `parseDate` reproduce `DateTime.parse` de Dart: sin zona es hora LOCAL (una `date` de
 * Postgres, `'2026-11-02'`, es la medianoche local, no la UTC como `new Date('2026-11-02')`);
 * con `Z` u offset es un instante exacto.
 */
describe('parsearFecha', () => {
  test('una date YYYY-MM-DD es la medianoche local', () => {
    const d = parseDate('2026-11-02');
    expect(d).toEqual(localDate(2026, 11, 2));
    expect([d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours()]).toEqual([2026, 11, 2, 0]);
    expect(dateToIso(d)).toBe('2026-11-02');
  });

  test('timestamptz de PostgREST con offset: instante exacto', () => {
    expect(parseDate('2026-10-27T13:00:00+00:00')).toEqual(utcDate(2026, 10, 27, 13));
    expect(parseDate('2026-10-27T08:00:00-05:00')).toEqual(utcDate(2026, 10, 27, 13));
    expect(parseDate('2026-10-27T13:00:00Z')).toEqual(utcDate(2026, 10, 27, 13));
    expect(parseDate('2026-10-27 13:00:00+00')).toEqual(utcDate(2026, 10, 27, 13));
  });

  test('fracciones de segundo de Postgres (microsegundos) se truncan a milisegundos', () => {
    expect(parseDate('2026-10-27T13:00:00.123456+00:00').getTime()).toBe(
      utcDate(2026, 10, 27, 13).getTime() + 123,
    );
    expect(parseDate('2026-10-27T13:00:00.5Z').getTime()).toBe(
      utcDate(2026, 10, 27, 13).getTime() + 500,
    );
  });

  test('fecha y hora sin zona: hora local', () => {
    expect(parseDate('2026-11-02T06:30:00')).toEqual(localDate(2026, 11, 2, 6, 30));
  });

  test('texto inválido: parsearFecha lanza e intentarParsearFecha devuelve null', () => {
    expect(() => parseDate('mañana')).toThrow();
    expect(tryParseDate('mañana')).toBeNull();
    expect(tryParseDate('')).toBeNull();
    expect(tryParseDate('2027-01-15')).toEqual(localDate(2027, 1, 15));
  });
});

describe('fechaToIso y mismoDia', () => {
  test('rellena con ceros y usa los campos locales', () => {
    expect(dateToIso(localDate(2026, 1, 5))).toBe('2026-01-05');
    expect(dateToIso(localDate(2026, 11, 2, 23, 59))).toBe('2026-11-02');
  });

  test('fechaLocal normaliza el desbordamiento como DateTime de Dart', () => {
    expect(dateToIso(localDate(2026, 12, 31 + 3))).toBe('2027-01-03');
  });

  test('mismoDia compara año, mes y día locales', () => {
    expect(isSameDay(localDate(2026, 11, 2, 1), localDate(2026, 11, 2, 23))).toBe(true);
    expect(isSameDay(localDate(2026, 11, 2), localDate(2026, 11, 3))).toBe(false);
  });
});
