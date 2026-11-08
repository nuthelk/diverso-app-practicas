/** Fechas en español del Resumen. Las fechas son `yyyy-mm-dd` (día de calendario de Bogotá, como las salidas). */

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const DIAS_CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export const MESES_LARGOS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/** Mediodía local de ese día: lejos de los cambios de día, sirve para sumar y comparar días sin zona. */
export const aFecha = (iso: string) => new Date(iso + 'T12:00:00');

export function aISO(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${dia}`;
}

export function sumarDias(iso: string, dias: number): string {
  const d = aFecha(iso);
  d.setDate(d.getDate() + dias);
  return aISO(d);
}

/** «Jueves 5 de noviembre» (o «Jueves 5 de nov» con mes corto). */
export function diaLargo(iso: string, mes: 'largo' | 'corto' = 'largo'): string {
  const d = aFecha(iso);
  const dia = DIAS[d.getDay()];
  const nombreMes = (mes === 'largo' ? MESES_LARGOS : MESES)[d.getMonth()];
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)} ${d.getDate()} de ${nombreMes}`;
}

/** «lun 9 nov». */
export function diaCorto(iso: string): string {
  const d = aFecha(iso);
  return `${DIAS_CORTOS[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]}`;
}

/** «lun»: el día de la semana, abreviado. */
export const abreviaturaDia = (iso: string) => DIAS_CORTOS[aFecha(iso).getDay()];

/** «Del 2 al 8 de noviembre» o, si cruza de mes, «Del 26 de octubre al 1 de noviembre». */
export function rangoTexto(inicio: string, fin: string): string {
  const a = aFecha(inicio);
  const b = aFecha(fin);
  const mesFin = MESES_LARGOS[b.getMonth()];
  return a.getMonth() === b.getMonth()
    ? `Del ${a.getDate()} al ${b.getDate()} de ${mesFin}`
    : `Del ${a.getDate()} de ${MESES_LARGOS[a.getMonth()]} al ${b.getDate()} de ${mesFin}`;
}

/** Primer día del mes de esa fecha. */
export const inicioDeMes = (iso: string) => `${iso.slice(0, 7)}-01`;

/** Último día del mes de esa fecha. */
export function finDeMes(iso: string): string {
  const d = aFecha(iso);
  return aISO(new Date(d.getFullYear(), d.getMonth() + 1, 0, 12));
}

/** Esa fecha `meses` meses después (o antes): el mismo día, o el último del mes si ese mes no lo tiene. */
export function sumarMeses(iso: string, meses: number): string {
  const d = aFecha(iso);
  const mes = d.getMonth() + meses;
  const ultimo = new Date(d.getFullYear(), mes + 1, 0, 12).getDate();
  return aISO(new Date(d.getFullYear(), mes, Math.min(d.getDate(), ultimo), 12));
}

/** «lun 9 nov», «5–11 nov» o, si cruza de mes, «28 oct – 3 nov»: para el chip del período. */
export function rangoCorto(inicio: string, fin: string): string {
  if (inicio === fin) return diaCorto(inicio);
  const a = aFecha(inicio);
  const b = aFecha(fin);
  return a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()
    ? `${a.getDate()}–${b.getDate()} ${MESES[b.getMonth()]}`
    : `${a.getDate()} ${MESES[a.getMonth()]} – ${b.getDate()} ${MESES[b.getMonth()]}`;
}

/** «Jueves 5 de noviembre» si es un solo día; si no, como `rangoTexto`. */
export const rangoLargo = (inicio: string, fin: string) => (inicio === fin ? diaLargo(inicio) : rangoTexto(inicio, fin));
