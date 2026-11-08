/**
 * «Quiénes van» y reseñas recientes: lo que el servidor le deja ver a la agencia de sus viajeros
 * (funciones `quienes_van` y `resenas_recientes_agencia`, migración 0015). Solo nombre corto y número de
 * personas: nunca teléfono, correo ni documento.
 */

import { plural } from '$lib/shared/lib/format';

export type EstadoReservaViva = 'pendiente_pago' | 'confirmada';

export interface QuienViaja {
  plan_date_id: string;
  booking_id: string;
  codigo: string;
  /** «Laura V.»: primera palabra + inicial del último apellido; «Viajero» si no hay nombre. */
  nombre_corto: string;
  pax: number;
  estado: EstadoReservaViva;
}

export interface ResenaReciente {
  calificacion: number;
  comentario: string | null;
  nombre_corto: string;
  plan_titulo: string;
  created_at: string;
}

/** Qué hay en «Quiénes van»: cargando, las reservas o el error (con reintento). */
export type EstadoQuienes = 'cargando' | 'ok' | 'error';

/** Una reserva de «Quiénes van», lista para pintar. */
export interface ReservaDeSalida {
  id: string;
  /** «Laura V.». */
  nombre: string;
  personas: number;
  /** «2 personas». */
  texto: string;
  /** Aún no la pagan: la salida cuenta con ella, pero no está confirmada. */
  pendiente: boolean;
}

/** Las reservas vivas agrupadas por fecha del plan; en cada una, las confirmadas primero (el resto conserva su orden). */
export function reservasPorFecha(filas: QuienViaja[]): Map<string, ReservaDeSalida[]> {
  const grupos = new Map<string, ReservaDeSalida[]>();
  for (const f of filas) {
    const lista = grupos.get(f.plan_date_id) ?? [];
    lista.push({
      id: f.booking_id,
      nombre: f.nombre_corto,
      personas: f.pax,
      texto: `${f.pax} ${plural(f.pax, 'persona', 'personas')}`,
      pendiente: f.estado === 'pendiente_pago',
    });
    grupos.set(f.plan_date_id, lista);
  }
  for (const [id, lista] of grupos) {
    grupos.set(id, [...lista.filter((r) => !r.pendiente), ...lista.filter((r) => r.pendiente)]);
  }
  return grupos;
}

/** «5 de 24 cupos reservados · 19 libres». */
export function cuposDeSalida(s: { reservados: number; total: number; libres: number }): string {
  return `${s.reservados} de ${s.total} cupos reservados · ${s.libres} ${plural(s.libres, 'libre', 'libres')}`;
}
