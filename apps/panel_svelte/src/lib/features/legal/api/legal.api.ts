import { supabase } from '$lib/shared/api/supabase';
import { VERSION_LEGAL, type TipoConsentimiento } from '../model/legal';

/** Consentimientos (Ley 1581). */

export async function consentimientosPendientes(): Promise<TipoConsentimiento[]> {
  const { data, error } = await supabase.rpc('consentimientos_pendientes');
  if (error) throw error;
  return (data ?? []) as TipoConsentimiento[];
}

export async function registrarConsentimiento(tipo: TipoConsentimiento): Promise<void> {
  const { error } = await supabase.rpc('registrar_consentimiento', {
    p_tipo: tipo,
    p_version: VERSION_LEGAL,
    p_origen: 'panel',
  });
  if (error) throw error;
}
