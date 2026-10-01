import { supabase } from './supabase';
import {
  draftToRow,
  type Agency,
  type Plan,
  type PlanDate,
  type PlanDraft,
  type VentaRow,
} from './types';

/** Capa de datos del panel — mismas consultas que AgencyService en Flutter. */

export async function miAgencia(): Promise<Agency | null> {
  const uid = (await supabase.auth.getUser()).data.user?.id;
  if (!uid) return null;
  const { data, error } = await supabase
    .from('agencies')
    .select('*')
    .eq('owner_user_id', uid)
    .maybeSingle();
  if (error) throw error;
  return (data as Agency | null) ?? null;
}

export async function registrarAgencia(datos: {
  nombre: string;
  numero_rnt: string;
  matricula_camara_comercio: string;
  ciudad: string;
  telefono: string;
  email: string;
  whatsapp: string;
  descripcion: string;
}): Promise<void> {
  const uid = (await supabase.auth.getUser()).data.user?.id;
  const { error } = await supabase.from('agencies').insert({
    owner_user_id: uid,
    ...datos,
    // estado_verificacion queda 'pendiente' por la política RLS
  });
  if (error) throw error;
}

export async function misPlanes(agencyId: string): Promise<Plan[]> {
  const { data, error } = await supabase
    .from('plans')
    .select('*, agencies(*), plan_dates(*)')
    .eq('agency_id', agencyId)
    .order('created_at', { ascending: false })
    .order('fecha', { ascending: true, referencedTable: 'plan_dates' });
  if (error) throw error;
  return (data ?? []) as Plan[];
}

export async function crearPlan(agencyId: string, draft: PlanDraft): Promise<string> {
  const { data, error } = await supabase
    .from('plans')
    .insert({ ...draftToRow(draft), agency_id: agencyId })
    .select('id')
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

export async function actualizarPlan(draft: PlanDraft): Promise<void> {
  const { error } = await supabase
    .from('plans')
    .update(draftToRow(draft))
    .eq('id', draft.id!);
  if (error) throw error;
}

export async function publicarPlan(planId: string, publicado: boolean): Promise<void> {
  const { error } = await supabase
    .from('plans')
    .update({ estado: publicado ? 'publicado' : 'borrador' })
    .eq('id', planId);
  if (error) throw error;
}

export async function agregarFecha(
  planId: string,
  fecha: string,
  cupoTotal: number,
): Promise<void> {
  const { error } = await supabase.from('plan_dates').insert({
    plan_id: planId,
    fecha,
    cupo_total: cupoTotal,
    cupo_disponible: cupoTotal,
  });
  if (error) throw error;
}

export async function eliminarFecha(planDateId: string): Promise<void> {
  const { error } = await supabase.from('plan_dates').delete().eq('id', planDateId);
  if (error) throw error;
}

export async function ventas(agencyId: string, limit = 200): Promise<VentaRow[]> {
  const { data, error } = await supabase
    .from('agency_sales')
    .select('*')
    .eq('agency_id', agencyId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as VentaRow[];
}

export async function misVentas(): Promise<{
  agencia: Agency | null;
  planes: Plan[];
  ventas: VentaRow[];
}> {
  const agencia = await miAgencia();
  if (!agencia) return { agencia: null, planes: [], ventas: [] };
  const [planes, ventasAgencia] = await Promise.all([
    misPlanes(agencia.id),
    ventas(agencia.id),
  ]);
  return { agencia, planes, ventas: ventasAgencia };
}

/* Admin -------------------------------------------------------------- */

export async function todasLasAgencias(): Promise<Agency[]> {
  const { data, error } = await supabase
    .from('agencies')
    .select('*')
    .order('estado_verificacion')
    .order('created_at');
  if (error) throw error;
  return (data ?? []) as Agency[];
}

export async function cambiarVerificacion(agencyId: string, estado: string): Promise<void> {
  // El trigger guard_agency_verification permite el cambio solo a admins.
  const { error } = await supabase
    .from('agencies')
    .update({ estado_verificacion: estado })
    .eq('id', agencyId);
  if (error) throw error;
}

export function mensajeError(e: unknown): string {
  const m = (e as { message?: string })?.message ?? String(e);
  return m;
}

export type { PlanDate };
