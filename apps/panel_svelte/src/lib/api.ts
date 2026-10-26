import { supabase } from './supabase';
import {
  draftToRow,
  type Agency,
  type Plan,
  type PlanDate,
  type PlanDraft,
  type VentaRow,
  type VerificationLog,
} from './types';
import { VERSION_LEGAL, type TipoConsentimiento } from './legal';
import { BUCKET_LOGOS, rutaDeLogo, rutaNuevaLogo, validarLogo } from './logo';
import { conPoliticaGenerada, MENSAJE_NOTAS_CON_POLITICA } from './politica';
import {
  normalizarCuenta,
  type CuentaDispersion,
  type CuentaResumen,
  type Liquidacion,
  type LiquidacionDetalle,
} from './liquidaciones';

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

/* Logo de la agencia (bucket público `agency-logos`, carpeta `<agency_id>/`) ----- */

type AgenciaConLogo = Pick<Agency, 'id' | 'logo_url'>;

/** Borrar el objeto viejo es limpieza: si falla, el logo nuevo igual quedó guardado. */
async function borrarObjetoLogo(ruta: string | null): Promise<void> {
  if (!ruta) return;
  try {
    await supabase.storage.from(BUCKET_LOGOS).remove([ruta]);
  } catch {
    /* queda un archivo huérfano en la carpeta de la agencia; no afecta al logo vigente */
  }
}

/** Sube un logo con nombre único, lo fija en `agencies.logo_url` y borra el anterior. Devuelve la URL pública. */
export async function subirLogo(agencia: AgenciaConLogo, archivo: File): Promise<string> {
  const problema = validarLogo(archivo);
  if (problema) throw new Error(problema);

  const bucket = supabase.storage.from(BUCKET_LOGOS);
  const ruta = rutaNuevaLogo(agencia.id, archivo.type);
  const { error: errorSubida } = await bucket.upload(ruta, archivo, {
    contentType: archivo.type,
    cacheControl: '31536000', // el nombre cambia en cada subida: se puede cachear un año
    upsert: false,
  });
  if (errorSubida) throw errorSubida;

  const url = bucket.getPublicUrl(ruta).data.publicUrl;
  const { error } = await supabase.from('agencies').update({ logo_url: url }).eq('id', agencia.id);
  if (error) {
    await borrarObjetoLogo(ruta);
    throw error;
  }
  await borrarObjetoLogo(rutaDeLogo(agencia.logo_url, agencia.id));
  return url;
}

/** Quita el logo: primero deja de apuntar a él y luego borra el objeto. */
export async function quitarLogo(agencia: AgenciaConLogo): Promise<void> {
  const { error } = await supabase.from('agencies').update({ logo_url: null }).eq('id', agencia.id);
  if (error) throw error;
  await borrarObjetoLogo(rutaDeLogo(agencia.logo_url, agencia.id));
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

/* Liquidaciones y cuenta para dispersiones (modo prueba) ------------------ */

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

/* Admin: dispersión de prueba -------------------------------------------- */

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

/* Consentimientos (Ley 1581) ------------------------------------------ */

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

/** Mensajes legibles para los códigos que lanzan las funciones y triggers SQL. */
const ERRORES: Record<string, string> = {
  AGENCIA_NO_VERIFICADA: 'Tu agencia aún no está verificada; el plan queda como borrador.',
  RNT_VENCIDO: 'El RNT de tu agencia está vencido. Renuévalo para volver a publicar.',
  VIGENCIA_RNT_REQUERIDA: 'Indica hasta cuándo está vigente el RNT para verificar la agencia.',
  VIGENCIA_RNT_VENCIDA: 'La vigencia del RNT debe ser una fecha futura.',
  MOTIVO_RECHAZO_REQUERIDO: 'Escribe el motivo del rechazo; la agencia lo verá en su panel.',
  VERSION_DESACTUALIZADA: 'Los documentos legales cambiaron. Recarga la página y acéptalos de nuevo.',
  agencies_rnt_formato: 'El número de RNT debe tener entre 4 y 8 dígitos, sin letras.',
  agencies_matricula_formato: 'La matrícula mercantil debe ser numérica (se admiten guiones).',
  agencies_numero_rnt_key: 'Ya existe una agencia registrada con ese número de RNT.',
  LOGO_URL_INVALIDO: 'No pudimos guardar el logo: la imagen no es válida. Súbela de nuevo.',
  'exceeded the maximum allowed size': 'La imagen supera el máximo de 2 MB.',
  'mime type': 'Solo se admiten imágenes PNG, JPG o WebP.',
  NO_AUTORIZADO: 'No tienes permiso para esta acción.',
  SEMANA_NO_TERMINADA: 'Esa semana aún no termina: solo se liquidan semanas completas (lunes a domingo).',
  LIQUIDACION_NO_EXISTE: 'La liquidación ya no existe. Recarga la lista.',
  LIQUIDACION_NO_PENDIENTE: 'Esa liquidación ya fue ejecutada o anulada.',
  CUENTA_NO_REGISTRADA: 'La agencia aún no registró su cuenta para dispersiones.',
  MONTO_NO_POSITIVO: 'El monto a pagar es cero o negativo: no hay nada que dispersar.',
  FECHA_CON_RESERVAS:
    'Esa fecha tiene reservas activas (pendientes de pago o confirmadas): no se puede mover ni eliminar.',
  agency_payout_accounts_numero_cuenta_check: 'El número de cuenta debe tener de 6 a 20 dígitos.',
  agency_payout_accounts_numero_documento_check: 'El documento debe tener de 4 a 20 caracteres, sin puntos ni espacios.',
  agency_payout_accounts_titular_check: 'Escribe el nombre del titular (mínimo 3 caracteres).',
  agency_payout_accounts_banco_check: 'Indica el banco (entre 2 y 80 caracteres).',
  NOTAS_CON_POLITICA: MENSAJE_NOTAS_CON_POLITICA,
  plans_politica_parcial_coherente:
    'La ventana parcial debe ser menor que la de cancelación gratuita y llevar su porcentaje.',
  'Failed to fetch': 'No hay conexión con el servidor. Verifica que el backend esté encendido.',
};

export function mensajeError(e: unknown): string {
  const m = (e as { message?: string })?.message ?? String(e);
  for (const [clave, texto] of Object.entries(ERRORES)) {
    if (m.includes(clave)) return texto;
  }
  return m;
}

export type { PlanDate };
