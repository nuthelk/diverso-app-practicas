import { supabase } from '$lib/shared/api/supabase';
import { draftToRow, type Plan, type PlanDraft } from '../model/plan';
import { conPoliticaGenerada } from '../model/politica';

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
    .insert({ ...draftToRow(conPoliticaGenerada(draft)), agency_id: agencyId })
    .select('id')
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

export async function actualizarPlan(draft: PlanDraft): Promise<void> {
  const { error } = await supabase
    .from('plans')
    .update(draftToRow(conPoliticaGenerada(draft)))
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
