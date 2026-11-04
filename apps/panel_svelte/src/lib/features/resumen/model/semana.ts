/** La agenda de la semana (lunes a domingo, día de Bogotá): días con sus salidas, «Más adelante» y el teclado. */

import { lunesDeSemana } from '$lib/features/liquidaciones/model/liquidaciones';
import { fechaBogota, yaSalio, type Plan } from '$lib/features/planes/model/plan';
import { horaCorta } from '$lib/features/planes/model/politica';
import { unirNombres } from '$lib/shared/lib/format';
import { abreviaturaDia, aFecha, diaCorto, diaLargo, rangoTexto, sumarDias } from './fechas';

export interface SalidaSemana {
  /** Id de la fecha del plan (`plan_dates.id`): la clave de «Quiénes van». */
  id: string;
  planId: string;
  fecha: string;
  /** HH:MM, la hora de salida del plan. */
  hora: string;
  titulo: string;
  /** Cupos tomados (cupo total − disponible): lo que muestra el relleno. */
  reservados: number;
  total: number;
  libres: number;
  /** 0–100, para el relleno del bloque. */
  porcentaje: number;
  /** Ya partió: se muestra como pasada y no se puede reservar. */
  yaSalio: boolean;
  /** «Río Claro, Jueves 5 de noviembre, 06:30: 5 de 24 cupos reservados.» */
  descripcion: string;
}

export interface DiaSemana {
  fecha: string;
  /** «lun». */
  abreviatura: string;
  numero: number;
  hoy: boolean;
  pasado: boolean;
  salidas: SalidaSemana[];
}

export interface Semana {
  inicio: string;
  fin: string;
  /** «Del 2 al 8 de noviembre». */
  rango: string;
  dias: DiaSemana[];
}

/**
 * Todas las salidas de la agencia, por fecha y hora. Un plan en borrador solo aparece si ya tiene personas
 * reservadas en esa fecha.
 */
function todasLasSalidas(planes: Plan[], hoy: Date): SalidaSemana[] {
  const salidas: SalidaSemana[] = [];
  for (const p of planes) {
    for (const d of p.plan_dates) {
      const total = Math.max(d.cupo_total, 0);
      const reservados = Math.min(Math.max(total - d.cupo_disponible, 0), total);
      if (p.estado !== 'publicado' && reservados === 0) continue;
      const hora = horaCorta(p.hora_salida);
      salidas.push({
        id: d.id,
        planId: p.id,
        fecha: d.fecha,
        hora,
        titulo: p.titulo,
        reservados,
        total,
        libres: d.cupo_disponible,
        porcentaje: total > 0 ? Math.round((reservados / total) * 100) : 0,
        yaSalio: yaSalio(p, d, hoy),
        descripcion: `${p.titulo}, ${diaLargo(d.fecha)}, ${hora}: ${reservados} de ${total} cupos reservados.`,
      });
    }
  }
  return salidas.sort(
    (a, b) => a.fecha.localeCompare(b.fecha) || a.hora.localeCompare(b.hora) || a.titulo.localeCompare(b.titulo),
  );
}

/** La semana de Bogotá que contiene hoy (`desplazamiento` 0) o la siguiente (1), con las salidas de cada día. */
export function semanaDeSalidas(planes: Plan[], desplazamiento: 0 | 1, hoy = new Date()): Semana {
  const hoyISO = fechaBogota(hoy);
  const inicio = sumarDias(lunesDeSemana(hoyISO), 7 * desplazamiento);
  const fin = sumarDias(inicio, 6);
  const salidas = todasLasSalidas(planes, hoy);
  const dias = Array.from({ length: 7 }, (_, i): DiaSemana => {
    const f = sumarDias(inicio, i);
    return {
      fecha: f,
      abreviatura: abreviaturaDia(f),
      numero: aFecha(f).getDate(),
      hoy: f === hoyISO,
      pasado: f < hoyISO,
      salidas: salidas.filter((s) => s.fecha === f),
    };
  });
  return { inicio, fin, rango: rangoTexto(inicio, fin), dias };
}

export interface MasAdelante {
  fecha: string;
  /** «mié 11 nov». */
  dia: string;
  /** «mié 11 nov: Río Claro (4 de 24) y San Rafael (5 de 24)». */
  texto: string;
  salidas: { titulo: string; reservados: number; total: number }[];
  /** Cae en la semana siguiente a la de hoy: se puede ofrecer «Ver la semana siguiente». */
  enSiguienteSemana: boolean;
}

/** La primera fecha con salidas después de `fin` (el domingo de la semana mostrada), con todas sus salidas. */
export function masAdelante(planes: Plan[], fin: string, hoy = new Date()): MasAdelante | null {
  const siguientes = todasLasSalidas(planes, hoy).filter((s) => s.fecha > fin);
  if (siguientes.length === 0) return null;
  const fecha = siguientes[0].fecha;
  const finSiguiente = sumarDias(lunesDeSemana(fechaBogota(hoy)), 13);
  const salidas = siguientes
    .filter((s) => s.fecha === fecha)
    .map(({ titulo, reservados, total }) => ({ titulo, reservados, total }));
  const dia = diaCorto(fecha);
  return {
    fecha,
    dia,
    texto: `${dia}: ${unirNombres(salidas.map((s) => `${s.titulo} (${s.reservados} de ${s.total})`))}`,
    salidas,
    enSiguienteSemana: fecha <= finSiguiente,
  };
}

/** La primera salida de la semana que aún no parte; null si no queda ninguna. */
export function salidaPorDefecto(semana: Semana): string | null {
  for (const dia of semana.dias) {
    const proxima = dia.salidas.find((s) => !s.yaSalio);
    if (proxima) return proxima.id;
  }
  return null;
}

export type TeclaDeBloques = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown' | 'Home' | 'End';

/**
 * A qué bloque pasa el foco con una tecla: izquierda/derecha al día vecino que tenga salidas (misma posición, o la
 * última si ese día tiene menos), arriba/abajo por las salidas del día, Inicio/Fin a la primera/última de la semana.
 * En los extremos se queda donde está; si [actual] no está en la semana, devuelve la primera.
 */
export function siguienteBloque(semana: Semana, actual: string, tecla: TeclaDeBloques): string | null {
  const columnas = semana.dias.filter((d) => d.salidas.length > 0);
  if (columnas.length === 0) return null;
  const c = columnas.findIndex((d) => d.salidas.some((s) => s.id === actual));
  if (c === -1) return columnas[0].salidas[0].id;
  const f = columnas[c].salidas.findIndex((s) => s.id === actual);
  const enColumna = (i: number, fila: number) => {
    const col = columnas[Math.min(Math.max(i, 0), columnas.length - 1)].salidas;
    return col[Math.min(fila, col.length - 1)].id;
  };
  switch (tecla) {
    case 'ArrowLeft':
      return enColumna(c - 1, f);
    case 'ArrowRight':
      return enColumna(c + 1, f);
    case 'ArrowUp':
      return columnas[c].salidas[Math.max(f - 1, 0)].id;
    case 'ArrowDown':
      return columnas[c].salidas[Math.min(f + 1, columnas[c].salidas.length - 1)].id;
    case 'Home':
      return columnas[0].salidas[0].id;
    case 'End':
      return columnas[columnas.length - 1].salidas.at(-1)!.id;
  }
}
