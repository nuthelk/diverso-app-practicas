import { supabase } from '$lib/shared/api/supabase';
import type { QuienViaja, ResenaReciente } from '../model/quienes-van';

/** Reservas vivas (pendiente de pago o confirmadas) de esas fechas, solo de los planes de la agencia. */
export async function quienesVan(planDateIds: string[]): Promise<QuienViaja[]> {
  if (planDateIds.length === 0) return [];
  const { data, error } = await supabase.rpc('quienes_van', { p_plan_date_ids: planDateIds });
  if (error) throw error;
  return (data ?? []) as QuienViaja[];
}

/** Últimas reseñas de los planes de la agencia, la más nueva primero (el servidor topa en 20). */
export async function resenasRecientes(limite = 3): Promise<ResenaReciente[]> {
  const { data, error } = await supabase.rpc('resenas_recientes_agencia', { p_limite: limite });
  if (error) throw error;
  return (data ?? []) as ResenaReciente[];
}
