import { supabase } from '$lib/shared/api/supabase';
import {
  normalizarCuenta,
  type CuentaDispersion,
  type CuentaResumen,
  type Liquidacion,
  type LiquidacionDetalle,
} from './liquidaciones';

/** Liquidaciones y cuenta para dispersiones (modo prueba). */

export async function misLiquidaciones(agencyId: string): Promise<Liquidacion[]> {
  const { data, error } = await supabase
    .from('liquidaciones')
    .select('*')
    .eq('agency_id', agencyId)
    .order('periodo_inicio', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Liquidacion[];
}

export async function liquidacionDetalle(id: string): Promise<LiquidacionDetalle | null> {
  const { data, error } = await supabase
    .from('liquidaciones')
    .select('*, liquidacion_items!liquidacion_items_liquidacion_id_fkey(*, bookings(codigo, pax, plan_dates(fecha, plans(titulo))))')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as LiquidacionDetalle | null) ?? null;
}

/** Cuenta completa: solo la dueña (formulario). En listas se usa cuentasResumen. */
export async function miCuentaDispersion(agencyId: string): Promise<CuentaDispersion | null> {
  const { data, error } = await supabase
    .from('agency_payout_accounts')
    .select('banco, tipo_cuenta, numero_cuenta, titular, tipo_documento, numero_documento')
    .eq('agency_id', agencyId)
    .maybeSingle();
  if (error) throw error;
  return (data as CuentaDispersion | null) ?? null;
}

export async function guardarCuentaDispersion(agencyId: string, cuenta: CuentaDispersion): Promise<void> {
  const { error } = await supabase
    .from('agency_payout_accounts')
    .upsert({ ...normalizarCuenta(cuenta), agency_id: agencyId }, { onConflict: 'agency_id' });
  if (error) throw error;
}

/** Cuentas con solo los 4 últimos dígitos (la dueña ve la suya; el admin, todas). */
export async function cuentasResumen(): Promise<CuentaResumen[]> {
  const { data, error } = await supabase.from('cuentas_dispersion_resumen').select('*');
  if (error) throw error;
  return (data ?? []) as CuentaResumen[];
}

export async function serviciosPrestados(agencyId: string): Promise<number> {
  const { data, error } = await supabase.rpc('servicios_prestados', { p_agency_id: agencyId });
  if (error) throw error;
  return Number(data ?? 0);
}
