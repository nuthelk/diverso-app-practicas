/** El calendario de actividad del Resumen: viajeros por día y por semana, la cuadrícula del mes, el teclado y la selección. */

import { lunesDeSemana } from '$lib/features/liquidaciones/model/liquidaciones';
import { fechaBogota } from '$lib/features/planes/model/plan';
import { plural } from '$lib/shared/lib/format';
import { diaCorto, diaLargo, finDeMes, inicioDeMes, MESES_LARGOS, rangoTexto, sumarDias, sumarMeses } from './fechas';
import { periodoDeDia, periodoDeRango, textoChip, type Periodo } from './periodo';

/** 0: salidas sin viajeros; 1: 1–9; 2: 10–19; 3: 20 o más. Fijos, como en el diseño. */
export type Nivel = 0 | 1 | 2 | 3;

export const nivelDeViajeros = (viajeros: number): Nivel => (viajeros >= 20 ? 3 : viajeros >= 10 ? 2 : viajeros > 0 ? 1 : 0);

export interface Actividad {
  salidas: number;
  viajeros: number;
}

/** Salidas y viajeros por día (yyyy-mm-dd); los días sin salidas no están. */
export type ActividadPorDia = Map<string, Actividad>;

export function actividadPorDia(salidas: { fecha: string; reservados: number }[]): ActividadPorDia {
  const dias: ActividadPorDia = new Map();
  for (const s of salidas) {
    const dia = dias.get(s.fecha) ?? { salidas: 0, viajeros: 0 };
    dias.set(s.fecha, { salidas: dia.salidas + 1, viajeros: dia.viajeros + s.reservados });
  }
  return dias;
}

/** Lo que suman los días de un rango, extremos incluidos. */
export function actividadDeRango(actividad: ActividadPorDia, desde: string, hasta: string): Actividad {
  const total = { salidas: 0, viajeros: 0 };
  for (const [dia, a] of actividad) {
    if (dia < desde || dia > hasta) continue;
    total.salidas += a.salidas;
    total.viajeros += a.viajeros;
  }
  return total;
}

export interface DiaDelMes extends Actividad {
  fecha: string;
  numero: number;
  /** Es del mes que se está viendo (los demás son de la semana que lo rodea). */
  delMes: boolean;
  hoy: boolean;
  nivel: Nivel;
  /** Dentro del período elegido. */
  seleccionado: boolean;
  /** Primer o último día del período elegido. */
  extremo: boolean;
  /** «Jueves 5 de noviembre: 2 salidas, 12 viajeros». */
  etiqueta: string;
}

export interface SemanaDelMes extends Actividad {
  lunes: string;
  domingo: string;
  /** El período elegido es exactamente esta semana. */
  seleccionada: boolean;
  /** «Semana del 2 al 8 de noviembre: 2 salidas, 12 viajeros». */
  etiqueta: string;
  dias: DiaDelMes[];
}

const resumen = (a: Actividad) =>
  a.salidas > 0
    ? `${a.salidas} ${plural(a.salidas, 'salida', 'salidas')}, ${a.viajeros} ${plural(a.viajeros, 'viajero', 'viajeros')}`
    : 'sin salidas';

/** Las semanas (lunes a domingo) que cubren el mes de `vista`, con la actividad de cada día y su marca de selección. */
export function mesParaCalendario(
  actividad: ActividadPorDia,
  vista: string,
  hoy: Date,
  seleccion: Pick<Periodo, 'desde' | 'hasta'>,
): { titulo: string; semanas: SemanaDelMes[] } {
  const hoyISO = fechaBogota(hoy);
  const inicio = inicioDeMes(vista);
  const fin = finDeMes(vista);
  const semanas: SemanaDelMes[] = [];
  for (let lunes = lunesDeSemana(inicio); lunes <= fin; lunes = sumarDias(lunes, 7)) {
    const domingo = sumarDias(lunes, 6);
    const dias = Array.from({ length: 7 }, (_, i): DiaDelMes => {
      const fecha = sumarDias(lunes, i);
      const a = actividad.get(fecha) ?? { salidas: 0, viajeros: 0 };
      return {
        ...a,
        fecha,
        numero: Number(fecha.slice(8)),
        delMes: fecha >= inicio && fecha <= fin,
        hoy: fecha === hoyISO,
        nivel: nivelDeViajeros(a.viajeros),
        seleccionado: fecha >= seleccion.desde && fecha <= seleccion.hasta,
        extremo: fecha === seleccion.desde || fecha === seleccion.hasta,
        etiqueta: `${diaLargo(fecha)}${fecha === hoyISO ? ', hoy' : ''}: ${resumen(a)}`,
      };
    });
    const total = { salidas: dias.reduce((s, d) => s + d.salidas, 0), viajeros: dias.reduce((s, d) => s + d.viajeros, 0) };
    semanas.push({
      ...total,
      lunes,
      domingo,
      seleccionada: seleccion.desde === lunes && seleccion.hasta === domingo,
      etiqueta: `Semana ${rangoTexto(lunes, domingo).replace(/^Del/, 'del')}: ${resumen(total)}`,
      dias,
    });
  }
  const mes = MESES_LARGOS[Number(inicio.slice(5, 7)) - 1];
  return { titulo: `${mes.charAt(0).toUpperCase()}${mes.slice(1)} de ${inicio.slice(0, 4)}`, semanas };
}

/** A qué día pasa el foco con una tecla; null si no es una tecla del calendario. */
export function moverFoco(foco: string, tecla: string): string | null {
  switch (tecla) {
    case 'ArrowLeft':
      return sumarDias(foco, -1);
    case 'ArrowRight':
      return sumarDias(foco, 1);
    case 'ArrowUp':
      return sumarDias(foco, -7);
    case 'ArrowDown':
      return sumarDias(foco, 7);
    case 'Home':
      return lunesDeSemana(foco);
    case 'End':
      return sumarDias(lunesDeSemana(foco), 6);
    case 'PageUp':
      return sumarMeses(foco, -1);
    case 'PageDown':
      return sumarMeses(foco, 1);
    default:
      return null;
  }
}

/**
 * Qué pasa al elegir un día: sin modo rango es un período de un día; con él, el primer día queda de ancla (sin período
 * todavía) y el segundo cierra el rango.
 */
export function elegirDia(modoRango: boolean, ancla: string | null, dia: string): { periodo: Periodo | null; ancla: string | null } {
  if (!modoRango) return { periodo: periodoDeDia(dia), ancla: null };
  if (!ancla) return { periodo: null, ancla: dia };
  return { periodo: periodoDeRango(ancla, dia), ancla: null };
}

/** La línea de estado bajo la cuadrícula: qué falta para cerrar un rango o, si no, qué período hay y cuánto suma. */
export function estadoCalendario(datos: {
  modoRango: boolean;
  ancla: string | null;
  periodo: Periodo;
  actividad: ActividadPorDia;
  hoy: Date;
}): { titulo: string | null; texto: string } {
  const { modoRango, ancla, periodo, actividad, hoy } = datos;
  if (ancla) return { titulo: null, texto: `Primer día: ${diaCorto(ancla)}. Elige el último día del rango.` };
  if (modoRango) return { titulo: null, texto: 'Elige el primer día del rango.' };
  const a = actividadDeRango(actividad, periodo.desde, periodo.hasta);
  return {
    titulo: textoChip(periodo, hoy),
    texto: `${a.salidas} ${plural(a.salidas, 'salida', 'salidas')} · ${a.viajeros} ${plural(a.viajeros, 'viajero', 'viajeros')}`,
  };
}
