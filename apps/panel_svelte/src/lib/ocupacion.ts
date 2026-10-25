/** Lógica pura de ocupación de cupos por salida (Dashboard). */

import { fechasFuturas, type Plan } from './types';

export interface Salida {
  fecha: string;
  titulo: string;
  cupos: number;
  total: number;
  vendidos: number;
  ocup: number;
}

/** Resumen agregado de ocupación (próximas 8 semanas). */
export function resumenOcupacion(
  planes: Plan[],
  hoy = new Date(),
): { vendidos: number; total: number; ocup: number } {
  const inicio = new Date(hoy);
  inicio.setHours(0, 0, 0, 0);
  const fin = new Date(inicio);
  fin.setDate(inicio.getDate() + 56);
  let vendidos = 0;
  let total = 0;
  for (const p of planes) {
    for (const d of p.plan_dates) {
      const f = new Date(d.fecha + 'T00:00:00');
      if (f >= inicio && f < fin) {
        vendidos += d.cupo_total - d.cupo_disponible;
        total += d.cupo_total;
      }
    }
  }
  return { vendidos, total, ocup: total === 0 ? 0 : vendidos / total };
}

/** Salidas futuras con su nivel de llenado, de la más llena a la más vacía (máximo 6). */
export function proximasSalidas(planes: Plan[], hoy = new Date()): Salida[] {
  const lista = planes.flatMap((p) =>
    fechasFuturas(p, hoy).map((d) => ({
      fecha: d.fecha,
      titulo: p.titulo,
      cupos: d.cupo_disponible,
      total: d.cupo_total,
      vendidos: d.cupo_total - d.cupo_disponible,
      ocup: d.cupo_total === 0 ? 0 : (d.cupo_total - d.cupo_disponible) / d.cupo_total,
    })),
  );
  return lista.sort((a, b) => b.ocup - a.ocup || a.fecha.localeCompare(b.fecha)).slice(0, 6);
}
