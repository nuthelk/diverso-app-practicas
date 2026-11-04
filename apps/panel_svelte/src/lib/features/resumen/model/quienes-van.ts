/**
 * «Quiénes van» y reseñas recientes: lo que el servidor le deja ver a la agencia de sus viajeros
 * (funciones `quienes_van` y `resenas_recientes_agencia`, migración 0015). Solo nombre corto y número de
 * personas: nunca teléfono, correo ni documento.
 */

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
