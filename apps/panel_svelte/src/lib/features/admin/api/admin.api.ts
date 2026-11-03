import { supabase } from '$lib/shared/api/supabase';
import type { Agency, VerificationLog } from '$lib/features/agencias/model/agencia';
import type { Liquidacion } from '$lib/features/liquidaciones/model/liquidaciones';

/* Dispersión de prueba -------------------------------------------- */

export async function todasLiquidaciones(): Promise<Liquidacion[]> {
  const { data, error } = await supabase
    .from('liquidaciones')
    .select('*, agencies(nombre)')
    .order('created_at', { ascending: false })
    .limit(300);
  if (error) throw error;
  return (data ?? []) as Liquidacion[];
}

export async function generarLiquidaciones(
  semana: string,
): Promise<{ periodo_inicio: string; periodo_fin: string; liquidaciones: number; items: number }> {
  const { data, error } = await supabase.rpc('generar_liquidaciones', { p_semana: semana });
  if (error) throw error;
  return data;
}

export async function generarAnticipos(): Promise<{ liquidaciones: number; items: number }> {
  const { data, error } = await supabase.rpc('generar_anticipos');
  if (error) throw error;
  return data;
}

export async function ejecutarLiquidacion(id: string): Promise<{ referencia_prueba: string }> {
  const { data, error } = await supabase.rpc('ejecutar_liquidacion', { p_id: id });
  if (error) throw error;
  return data;
}

export async function bloquearAnticipo(agencyId: string, bloqueado: boolean): Promise<void> {
  const { error } = await supabase
    .from('agencies')
    .update({ anticipo_bloqueado: bloqueado })
    .eq('id', agencyId);
  if (error) throw error;
}

/* Verificación de agencias ---------------------------------------- */

export async function todasLasAgencias(): Promise<Agency[]> {
  const { data, error } = await supabase
    .from('agencies')
    .select('*')
    .order('estado_verificacion')
    .order('created_at');
  if (error) throw error;
  return (data ?? []) as Agency[];
}

/** Aprueba la agencia con la vigencia de su RNT (el trigger registra quién y cuándo). */
export async function verificarAgencia(agencyId: string, vigenteHasta: string): Promise<void> {
  const { error } = await supabase
    .from('agencies')
    .update({ estado_verificacion: 'verificado', rnt_vigente_hasta: vigenteHasta })
    .eq('id', agencyId);
  if (error) throw error;
}

/** Rechaza o revoca la verificación; el motivo es obligatorio y queda en el historial. */
export async function rechazarAgencia(agencyId: string, motivo: string): Promise<void> {
  const { error } = await supabase
    .from('agencies')
    .update({ estado_verificacion: 'rechazado', motivo_rechazo: motivo })
    .eq('id', agencyId);
  if (error) throw error;
}

/** Revalidación anual: registra la nueva vigencia del RNT. */
export async function actualizarVigencia(agencyId: string, vigenteHasta: string): Promise<void> {
  const { error } = await supabase
    .from('agencies')
    .update({ rnt_vigente_hasta: vigenteHasta })
    .eq('id', agencyId);
  if (error) throw error;
}

export async function historialVerificacion(agencyId: string): Promise<VerificationLog[]> {
  const { data, error } = await supabase
    .from('agency_verification_log')
    .select('*')
    .eq('agency_id', agencyId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as VerificationLog[];
}
