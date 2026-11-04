/** Reseñas recientes de los viajeros, listas para pintar. */

import { fechaBogota } from '$lib/features/planes/model/plan';
import { plural } from '$lib/shared/lib/format';
import { aFecha } from './fechas';
import type { ResenaReciente } from './quienes-van';

/** «hoy», «ayer», «hace 3 días», «hace 2 semanas», «hace 2 meses» o «hace 1 año», contando días de Bogotá. */
export function haceCuanto(iso: string, hoy = new Date()): string {
  const dias = Math.round((aFecha(fechaBogota(hoy)).getTime() - aFecha(fechaBogota(new Date(iso))).getTime()) / 86_400_000);
  if (dias <= 0) return 'hoy';
  if (dias === 1) return 'ayer';
  if (dias <= 7) return `hace ${dias} días`;
  if (dias < 30) {
    const semanas = Math.floor(dias / 7);
    return `hace ${semanas} ${plural(semanas, 'semana', 'semanas')}`;
  }
  if (dias < 365) {
    const meses = Math.floor(dias / 30);
    return `hace ${meses} ${plural(meses, 'mes', 'meses')}`;
  }
  const anios = Math.floor(dias / 365);
  return `hace ${anios} ${plural(anios, 'año', 'años')}`;
}

/** Estrellas llenas (de 5) de una calificación. */
export const estrellasLlenas = (calificacion: number) => Math.min(Math.max(Math.round(calificacion), 0), 5);

export interface ResenaMostrada {
  estrellas: number;
  /** null si el viajero solo puso estrellas. */
  texto: string | null;
  /** «Laura V.». */
  nombre: string;
  plan: string;
  cuando: string;
}

export function resenasParaMostrar(resenas: ResenaReciente[], hoy = new Date()): ResenaMostrada[] {
  return resenas.map((r) => ({
    estrellas: estrellasLlenas(r.calificacion),
    texto: r.comentario?.trim() || null,
    nombre: r.nombre_corto,
    plan: r.plan_titulo,
    cuando: haceCuanto(r.created_at, hoy),
  }));
}
