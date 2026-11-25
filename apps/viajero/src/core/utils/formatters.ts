/**
 * Formatos de moneda y fecha con salida IDÉNTICA a `intl` de Dart (locale `es` / `es_CO`).
 * Se usan tablas propias en vez de `Intl` porque el de Hermes (y el de cada navegador) cambia
 * abreviaturas, puntos y mayúsculas. Las fechas usan los campos LOCALES del `Date` (en Flutter se
 * formateaba después de `toLocal()`).
 */

/** Índice = `Date#getDay()` (0 = domingo). Patrón `EEEE`. */
export const LONG_DAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'] as const;

/** Índice = `Date#getDay()` (0 = domingo). Patrón `EEE`. */
export const SHORT_DAY_NAMES = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'] as const;

/** Índice = `Date#getMonth()` (0 = enero). Patrón `MMMM`. */
export const LONG_MONTH_NAMES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const;

/** Índice = `Date#getMonth()` (0 = enero). Patrón `MMM` («sept», no «sep», como CLDR/intl). */
export const SHORT_MONTH_NAMES = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sept',
  'oct',
  'nov',
  'dic',
] as const;

/** Formatea un monto en pesos colombianos: 165000 → "$ 165.000" (sin decimales). */
export function formatCOP(amount: number): string {
  // NumberFormat('#,##0') de Dart redondea la mitad alejándose de cero (Math.round no: -0.5 → -0).
  const whole = Math.round(Math.abs(amount));
  const thousands = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `$ ${amount < 0 && whole !== 0 ? '-' : ''}${thousands}`;
}

/** Espacio que no parte la línea (U+00A0). */
const NBSP = '\u00A0';

/**
 * Para un monto dentro de texto corrido que puede partirse en varias líneas: pega el «$» a su
 * número y el número a su «%» con espacios que no parten (U+00A0), para que «$» no quede solo al
 * final de una línea y la cifra abajo. `formatCOP` no cambia (paridad con `intl` de Dart y lo que
 * comparan muchas vistas): esto se aplica solo a la LÍNEA que lo contiene.
 */
export function noLineBreaks(text: string): string {
  return text.replace(/\$ (?=-?\d)/g, `$${NBSP}`).replace(/(\d) %/g, `$1${NBSP}%`);
}

/** Fecha de plan (sin hora): "sáb, 3 oct". Patrón Dart `EEE, d MMM`. */
export function formatShortDate(date: Date): string {
  return `${SHORT_DAY_NAMES[date.getDay()]}, ${date.getDate()} ${SHORT_MONTH_NAMES[date.getMonth()]}`;
}

/** Fecha de plan larga: "sábado 3 de octubre de 2026". Patrón Dart `EEEE d 'de' MMMM 'de' y`. */
export function formatLongDate(date: Date): string {
  return `${LONG_DAY_NAMES[date.getDay()]} ${formatDateInText(date)}`;
}

/** Fecha para usar dentro de una frase: "24 de octubre de 2026". Patrón Dart `d 'de' MMMM 'de' y`. */
export function formatDateInText(date: Date): string {
  return `${date.getDate()} de ${LONG_MONTH_NAMES[date.getMonth()]} de ${date.getFullYear()}`;
}

export { dateToIso } from './dates';
