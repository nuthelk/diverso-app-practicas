import { supabase } from '$lib/shared/api/supabase';
import type { ResenaAgencia } from '../model/resenas';

/** Una página de las reseñas de los planes de la agencia, la más nueva primero: `limite` (el servidor topa en 50) a partir de `desde`. */
export async function resenasAgencia({ limite, desde }: { limite: number; desde: number }): Promise<ResenaAgencia[]> {
  const { data, error } = await supabase.rpc('resenas_agencia', { p_limite: limite, p_desde: desde });
  if (error) throw error;
  return (data ?? []) as ResenaAgencia[];
}
