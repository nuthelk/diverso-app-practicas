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

/** «31 mar 2027». */
export function fechaConAnio(iso: string): string {
  const d = aFecha(iso);
  return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

/** «Del 2 al 8 de noviembre» o, si cruza de mes, «Del 26 de octubre al 1 de noviembre». */
export function rangoTexto(inicio: string, fin: string): string {
  const a = aFecha(inicio);
  const b = aFecha(fin);
  const mesFin = MESES_LARGOS[b.getMonth()];
  return a.getMonth() === b.getMonth()
    ? `Del ${a.getDate()} al ${b.getDate()} de ${mesFin}`
    : `Del ${a.getDate()} de ${MESES_LARGOS[a.getMonth()]} al ${b.getDate()} de ${mesFin}`;
}
