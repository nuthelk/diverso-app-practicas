/**
 * Fechas con la semántica de `DateTime` de Dart, que es la que usaba el núcleo Flutter.
 *
 * Un `Date` de JS es un instante. Las `date` de Postgres (`'YYYY-MM-DD'`) se leen como la
 * medianoche LOCAL (igual que `DateTime.parse` de Dart), nunca con `new Date('YYYY-MM-DD')`, que
 * da la medianoche UTC (en Bogotá cae el día anterior).
 */

/** `DateTime(año, mes, día, …)` de Dart: hora local, mes de 1 a 12; desborda como Dart (día 34 → mes siguiente). */
export function localDate(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
  ms = 0,
): Date {
  const d = new Date(2000, 0, 1, 0, 0, 0, 0);
  // setFullYear evita que los años 0–99 se lean como 1900–1999.
  d.setFullYear(year, month - 1, day);
  d.setHours(hour, minute, second, ms);
  return d;
}

/** `DateTime.utc(año, mes, día, …)` de Dart: mes de 1 a 12. */
export function utcDate(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
  ms = 0,
): Date {
  const d = new Date(0);
  d.setUTCFullYear(year, month - 1, day);
  d.setUTCHours(hour, minute, second, ms);
  return d;
}

// Mismo formato que acepta `DateTime.parse`: fecha, hora opcional (`T` o espacio), fracción y zona.
const ISO_DATE_PATTERN =
  /^([+-]?\d{4,6})-?(\d\d)-?(\d\d)(?:[Tt ](\d\d)(?::?(\d\d)(?::?(\d\d)(?:[.,](\d+))?)?)?\s?([zZ]|[+-]\d\d(?::?\d\d)?)?)?$/;

/** `DateTime.tryParse` de Dart: null si el texto no es una fecha ISO 8601. */
export function tryParseDate(text: string): Date | null {
  const m = ISO_DATE_PATTERN.exec(text);
  if (m === null) return null;
  const [, a, mo, d, h, mi, s, fraction, zone] = m;
  // JS solo guarda milisegundos: los microsegundos de Postgres se truncan.
  const ms = fraction === undefined ? 0 : Number(`${fraction}00`.slice(0, 3));
  const fields = [Number(a), Number(mo), Number(d), Number(h ?? 0), Number(mi ?? 0), Number(s ?? 0), ms] as const;
  if (zone === undefined) return localDate(...fields);
  const utc = utcDate(...fields);
  if (zone === 'z' || zone === 'Z') return utc;
  const sign = zone.startsWith('-') ? -1 : 1;
  const digits = zone.slice(1).replace(':', '');
  const offsetMin = Number(digits.slice(0, 2)) * 60 + Number(digits.slice(2) || '0');
  return new Date(utc.getTime() - sign * offsetMin * 60_000);
}

/** `DateTime.parse` de Dart: lanza si el texto no es una fecha ISO 8601. */
export function parseDate(text: string): Date {
  const d = tryParseDate(text);
  if (d === null) throw new Error(`FormatException: Invalid date format ${text}`);
  return d;
}

/** Convierte [date] a la cadena YYYY-MM-DD que espera PostgreSQL (campos locales). */
export function dateToIso(date: Date): string {
  const a = String(date.getFullYear()).padStart(4, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${a}-${m}-${d}`;
}

/** Mismo año, mes y día locales. */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}
