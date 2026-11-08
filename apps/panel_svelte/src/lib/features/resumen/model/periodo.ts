/**
 * El período del Resumen: un solo rango de días (`yyyy-mm-dd`, día de calendario de Bogotá) que filtra las salidas y el
 * dinero. Sale de un atajo, de un día, de una semana (lunes a domingo) o de un rango elegidos en el calendario.
 */

import { lunesDeSemana } from '$lib/features/liquidaciones/model/liquidaciones';
import { fechaBogota } from '$lib/features/planes/model/plan';
import { finDeMes, inicioDeMes, MESES_LARGOS, rangoCorto, rangoLargo, sumarDias } from './fechas';

export type Predefinido = 'hoy' | 'semana' | 'mes' | 'proximos30';
export type ClavePeriodo = Predefinido | 'dia' | 'sem' | 'rango';

export interface Periodo {
  clave: ClavePeriodo;
  desde: string;
  hasta: string;
}

/** Los atajos del calendario, con el texto de sus botones. */
export const PREDEFINIDOS: { clave: Predefinido; texto: string }[] = [
  { clave: 'hoy', texto: 'Hoy' },
  { clave: 'semana', texto: 'Esta semana' },
  { clave: 'mes', texto: 'Este mes' },
  { clave: 'proximos30', texto: 'Próximos 30 días' },
];

/** Lo que muestra el Resumen al abrirlo y a lo que vuelve «Quitar filtro». */
const INICIAL: Predefinido = 'mes';

export function periodoPredefinido(clave: Predefinido, hoy = new Date()): Periodo {
  const dia = fechaBogota(hoy);
  switch (clave) {
    case 'hoy':
      return { clave, desde: dia, hasta: dia };
    case 'semana': {
      const lunes = lunesDeSemana(dia);
      return { clave, desde: lunes, hasta: sumarDias(lunes, 6) };
    }
    case 'mes':
      return { clave, desde: inicioDeMes(dia), hasta: finDeMes(dia) };
    case 'proximos30':
      return { clave, desde: dia, hasta: sumarDias(dia, 29) };
  }
}

export const periodoInicial = (hoy = new Date()) => periodoPredefinido(INICIAL, hoy);

/** ¿Es el período con el que abre el Resumen (no hay un filtro de fecha que quitar)? */
export const esPeriodoInicial = (p: Periodo) => p.clave === INICIAL;

export const periodoDeDia = (dia: string): Periodo => ({ clave: 'dia', desde: dia, hasta: dia });

/** La semana de lunes a domingo que contiene ese día. */
export function periodoDeSemana(dia: string): Periodo {
  const lunes = lunesDeSemana(dia);
  return { clave: 'sem', desde: lunes, hasta: sumarDias(lunes, 6) };
}

/** Un rango entre dos días en cualquier orden; si es el mismo día, es un día. */
export function periodoDeRango(a: string, b: string): Periodo {
  const [desde, hasta] = a <= b ? [a, b] : [b, a];
  return desde === hasta ? periodoDeDia(desde) : { clave: 'rango', desde, hasta };
}

/**
 * El texto del chip: «Este mes · 1–30 nov», «jue 5 nov», «Semana 2–8 nov» o «5–12 nov». Fuera del año en curso suma el
 * año para que no haya duda.
 */
export function textoChip(p: Periodo, hoy = new Date()): string {
  const rango = rangoCorto(p.desde, p.hasta);
  const atajo = PREDEFINIDOS.find((a) => a.clave === p.clave);
  const base = atajo ? `${atajo.texto} · ${rango}` : p.clave === 'sem' ? `Semana ${rango}` : rango;
  const anio = fechaBogota(hoy).slice(0, 4);
  return p.desde.slice(0, 4) === anio && p.hasta.slice(0, 4) === anio ? base : `${base} ${p.hasta.slice(0, 4)}`;
}

/** «Noviembre de 2026» para el mes; «Del 5 al 12 de noviembre» o «Jueves 5 de noviembre» para lo demás. */
export function tituloPeriodo(p: Periodo): string {
  if (p.clave !== 'mes') return rangoLargo(p.desde, p.hasta);
  const mes = MESES_LARGOS[Number(p.desde.slice(5, 7)) - 1];
  return `${mes.charAt(0).toUpperCase()}${mes.slice(1)} de ${p.desde.slice(0, 4)}`;
}

/** Para «No hay salidas …»: «de noviembre de 2026», «del jueves 5 de noviembre» o «del 5 al 12 de noviembre». */
export function viajesDe(p: Periodo): string {
  if (p.clave === 'mes') return `de ${MESES_LARGOS[Number(p.desde.slice(5, 7)) - 1]} de ${p.desde.slice(0, 4)}`;
  const texto = rangoLargo(p.desde, p.hasta);
  return texto.startsWith('Del ') ? `del ${texto.slice(4)}` : `del ${texto.toLowerCase()}`;
}
