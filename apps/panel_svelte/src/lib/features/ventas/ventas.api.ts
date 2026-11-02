import { supabase } from '$lib/shared/api/supabase';
import { miAgencia } from '$lib/features/agencias/agencias.api';
import type { Agency } from '$lib/features/agencias/agencia';
import { misPlanes } from '$lib/features/planes/planes.api';
import type { Plan } from '$lib/features/planes/plan';
import type { VentaRow } from './ventas';

/**
 * Ventas de la agencia. Sin [desde]: las últimas 200 creadas (listas de Ventas y Planes). Con
 * [desde] (yyyy-mm-dd): todas las de viajes desde esa fecha, sin ese tope, para que los totales del
 * mes del Resumen no queden cortos en una agencia con mucho movimiento.
 */
export async function ventas(agencyId: string, desde?: string): Promise<VentaRow[]> {
  const consulta = supabase.from('agency_sales').select('*').eq('agency_id', agencyId);
  const { data, error } = desde
    ? await consulta.gte('fecha', desde)
    : await consulta.order('created_at', { ascending: false }).limit(200);
  if (error) throw error;
  return (data ?? []) as VentaRow[];
}

export async function misVentas(opciones: { desde?: string } = {}): Promise<{
  agencia: Agency | null;
  planes: Plan[];
  ventas: VentaRow[];
}> {
  const agencia = await miAgencia();
  if (!agencia) return { agencia: null, planes: [], ventas: [] };
  const [planes, ventasAgencia] = await Promise.all([
    misPlanes(agencia.id),
    ventas(agencia.id, opciones.desde),
  ]);
  return { agencia, planes, ventas: ventasAgencia };
}
