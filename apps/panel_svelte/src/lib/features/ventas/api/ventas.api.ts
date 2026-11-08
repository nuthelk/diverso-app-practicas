import { supabase } from '$lib/shared/api/supabase';
import { miAgencia } from '$lib/features/agencias/api/agencias.api';
import type { Agency } from '$lib/features/agencias/model/agencia';
import { misPlanes } from '$lib/features/planes/api/planes.api';
import type { Plan } from '$lib/features/planes/model/plan';
import type { VentaRow } from '../model/ventas';

/**
 * Ventas de la agencia. Sin [desde]: las últimas 200 creadas (listas de Ventas y Planes). Con [desde] (yyyy-mm-dd):
 * todas las de viajes desde esa fecha, sin ese tope, para que las cifras de un período del Resumen no queden cortas en
 * una agencia con mucho movimiento. [hasta] (yyyy-mm-dd, incluido) acota los viajes por arriba.
 */
export async function ventas(agencyId: string, desde?: string, hasta?: string): Promise<VentaRow[]> {
  let consulta = supabase.from('agency_sales').select('*').eq('agency_id', agencyId);
  if (hasta) consulta = consulta.lte('fecha', hasta);
  const { data, error } = desde
    ? await consulta.gte('fecha', desde)
    : await consulta.order('created_at', { ascending: false }).limit(200);
  if (error) throw error;
  return (data ?? []) as VentaRow[];
}

export async function misVentas(opciones: { desde?: string; hasta?: string } = {}): Promise<{
  agencia: Agency | null;
  planes: Plan[];
  ventas: VentaRow[];
}> {
  const agencia = await miAgencia();
  if (!agencia) return { agencia: null, planes: [], ventas: [] };
  const [planes, ventasAgencia] = await Promise.all([
    misPlanes(agencia.id),
    ventas(agencia.id, opciones.desde, opciones.hasta),
  ]);
  return { agencia, planes, ventas: ventasAgencia };
}
