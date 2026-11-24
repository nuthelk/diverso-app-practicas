/**
 * Fechas con la semántica de `DateTime` de Dart, que es la que usaba el núcleo Flutter.
 *
 * Un `Date` de JS es un instante. Las `date` de Postgres (`'YYYY-MM-DD'`) se leen como la
 * medianoche LOCAL (igual que `DateTime.parse` de Dart), nunca con `new Date('YYYY-MM-DD')`, que
 * da la medianoche UTC (en Bogotá cae el día anterior).
 */

/** `DateTime(año, mes, día, …)` de Dart: hora local, mes de 1 a 12; desborda como Dart (día 34 → mes siguiente). */
export function fechaLocal(
  anio: number,
  mes: number,
  dia: number,
  hora = 0,
  minuto = 0,
  segundo = 0,
  ms = 0,
): Date {
  const d = new Date(2000, 0, 1, 0, 0, 0, 0);
  // setFullYear evita que los años 0–99 se lean como 1900–1999.
  d.setFullYear(anio, mes - 1, dia);
  d.setHours(hora, minuto, segundo, ms);
  return d;
}

/** `DateTime.utc(año, mes, día, …)` de Dart: mes de 1 a 12. */
export function fechaUtc(
  anio: number,
  mes: number,
  dia: number,
  hora = 0,
  minuto = 0,
  segundo = 0,
  ms = 0,
): Date {
  const d = new Date(0);
  d.setUTCFullYear(anio, mes - 1, dia);
  d.setUTCHours(hora, minuto, segundo, ms);
  return d;
}

// Mismo formato que acepta `DateTime.parse`: fecha, hora opcional (`T` o espacio), fracción y zona.
const PATRON =
  /^([+-]?\d{4,6})-?(\d\d)-?(\d\d)(?:[Tt ](\d\d)(?::?(\d\d)(?::?(\d\d)(?:[.,](\d+))?)?)?\s?([zZ]|[+-]\d\d(?::?\d\d)?)?)?$/;

/** `DateTime.tryParse` de Dart: null si el texto no es una fecha ISO 8601. */
export function intentarParsearFecha(texto: string): Date | null {
  const m = PATRON.exec(texto);
  if (m === null) return null;
  const [, a, me, d, h, mi, s, fraccion, zona] = m;
  // JS solo guarda milisegundos: los microsegundos de Postgres se truncan.
  const ms = fraccion === undefined ? 0 : Number(`${fraccion}00`.slice(0, 3));
  const campos = [Number(a), Number(me), Number(d), Number(h ?? 0), Number(mi ?? 0), Number(s ?? 0), ms] as const;
  if (zona === undefined) return fechaLocal(...campos);
  const utc = fechaUtc(...campos);
  if (zona === 'z' || zona === 'Z') return utc;
  const signo = zona.startsWith('-') ? -1 : 1;
  const digitos = zona.slice(1).replace(':', '');
  const offsetMin = Number(digitos.slice(0, 2)) * 60 + Number(digitos.slice(2) || '0');
  return new Date(utc.getTime() - signo * offsetMin * 60_000);
}

/** `DateTime.parse` de Dart: lanza si el texto no es una fecha ISO 8601. */
export function parsearFecha(texto: string): Date {
  const d = intentarParsearFecha(texto);
  if (d === null) throw new Error(`FormatException: Invalid date format ${texto}`);
  return d;
}

/** Convierte [fecha] a la cadena YYYY-MM-DD que espera PostgreSQL (campos locales). */
export function fechaToIso(fecha: Date): string {
  const a = String(fecha.getFullYear()).padStart(4, '0');
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${a}-${m}-${d}`;
}

/** Mismo año, mes y día locales. */
export function mismoDia(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}
