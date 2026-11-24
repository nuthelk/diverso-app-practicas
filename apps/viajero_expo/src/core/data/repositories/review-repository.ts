import type { SupabaseClient } from '@supabase/supabase-js';

import { DiversoError } from '../../errors/diverso-error';
import type { Fila } from '../../models/fila';
import { Review } from '../../models/review';

export class ReviewRepository {
  private readonly client: SupabaseClient;

  constructor({ client }: { client: SupabaseClient }) {
    this.client = client;
  }

  /**
   * Reseñas del plan, más recientes primero, con el nombre del autor (`profiles(nombre)`: llega
   * null para reseñas AJENAS por RLS; se mantiene igual que en Flutter). NO traduce errores.
   */
  async porPlan(planId: string, { limit = 20 }: { limit?: number } = {}): Promise<Review[]> {
    const { data } = await this.client
      .from('reviews')
      .select('*, profiles(nombre)')
      .eq('plan_id', planId)
      .order('created_at', { ascending: false })
      .limit(limit)
      .throwOnError();
    return (data as unknown as Fila[]).map(Review.fromMap);
  }

  /**
   * Publica la reseña de una reserva propia ya viajada. El servidor valida (RLS) que la reserva
   * esté confirmada/completada, sea del usuario y la fecha ya haya pasado, y deriva plan/viajero.
   * El comentario se recorta; vacío → null. Errores → `DiversoError.fromPostgrest`.
   */
  async crear({
    bookingId,
    calificacion,
    comentario = null,
  }: {
    bookingId: string;
    calificacion: number;
    comentario?: string | null;
  }): Promise<void> {
    const recortado = comentario?.trim() ?? null;
    try {
      await this.client
        .from('reviews')
        .insert({ booking_id: bookingId, calificacion, comentario: recortado === '' ? null : recortado })
        .throwOnError();
    } catch (e) {
      throw DiversoError.fromPostgrest(e);
    }
  }
}
