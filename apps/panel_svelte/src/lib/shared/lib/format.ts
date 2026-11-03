/** Formateo idéntico al de la app Flutter (es-CO). */

const copFmt = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

export function cop(v: number): string {
  return copFmt.format(v);
}

const cortaFmt = new Intl.DateTimeFormat('es-CO', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});

export function fechaCorta(iso: string): string {
  return cortaFmt.format(new Date(iso + 'T12:00:00')).replace('.', '');
}

const largaFmt = new Intl.DateTimeFormat('es-CO', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export function fechaLarga(iso: string): string {
  const s = largaFmt.format(new Date(iso + 'T12:00:00'));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function hoyISO(): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

const textoFmt = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });

/** Fecha para usar dentro de una frase: «24 de octubre de 2026». */
export function fechaTexto(iso: string): string {
  return textoFmt.format(new Date(iso.slice(0, 10) + 'T12:00:00'));
}

const decimalFmt = new Intl.NumberFormat('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Un decimal con coma: «4,3». */
export function decimal1(v: number): string {
  return decimalFmt.format(v);
}
