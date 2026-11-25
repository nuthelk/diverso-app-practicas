/** «Tus planes»: cuántos viajeros y qué ocupación tiene cada plan en las salidas del período. */

import type { Salida } from './salidas';

export interface PlanVendido {
  id: string;
  titulo: string;
  /** Viajeros: personas reservadas en las salidas del período. */
  personas: number;
  salidas: number;
  /** Cupos de esas salidas. */
  cupos: number;
  /** 0–100, de los cupos de esas salidas. */
  ocupacion: number;
  /** 0–100, para la barra: relativo al plan con más viajeros. */
  ancho: number;
}

/** Por plan con salidas en el período: el que más viajeros tiene primero y, si empatan, por título. */
export function tusPlanes(salidas: Salida[]): PlanVendido[] {
  const porPlan = new Map<string, { id: string; titulo: string; personas: number; salidas: number; cupos: number }>();
  for (const s of salidas) {
    const p = porPlan.get(s.planId) ?? { id: s.planId, titulo: s.titulo, personas: 0, salidas: 0, cupos: 0 };
    porPlan.set(s.planId, { ...p, personas: p.personas + s.reservados, salidas: p.salidas + 1, cupos: p.cupos + s.total });
  }
  const planes = [...porPlan.values()].sort((a, b) => b.personas - a.personas || a.titulo.localeCompare(b.titulo));
  const maximo = planes[0]?.personas ?? 0;
  return planes.map((p) => ({
    ...p,
    ocupacion: p.cupos > 0 ? Math.round((p.personas / p.cupos) * 100) : 0,
    ancho: maximo > 0 ? Math.round((p.personas / maximo) * 100) : 0,
  }));
}
