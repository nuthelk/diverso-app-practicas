/** La agencia (tabla `agencies`), su historial de verificación y la vigencia de su RNT. */

import { fechaBogota } from '$lib/features/planes/model/plan';

export type VerificationStatus = 'pendiente' | 'verificado' | 'rechazado';

export interface Agency {
  id: string;
  nombre: string;
  numero_rnt: string;
  matricula_camara_comercio: string;
  ciudad: string;
  /** Opcionales en la base (columnas sin `not null`). */
  telefono: string | null;
  email: string | null;
  whatsapp: string | null;
  descripcion: string;
  /** URL pública del logo en el bucket `agency-logos` (null mientras no suba uno). */
  logo_url?: string | null;
  comision_pct: number;
  /** Lo gestiona el admin: una agencia bloqueada no recibe anticipos. */
  anticipo_bloqueado?: boolean;
  estado_verificacion: VerificationStatus;
  rnt_vigente_hasta: string | null; // yyyy-mm-dd
  verificado_at: string | null;
  motivo_rechazo: string | null;
  created_at?: string;
}

export type VerificationAction =
  | 'registrada'
  | 'verificada'
  | 'rechazada'
  | 'reverificacion_requerida'
  | 'vigencia_actualizada';

export interface VerificationLog {
  id: string;
  agency_id: string;
  accion: VerificationAction;
  numero_rnt: string;
  matricula: string;
  vigente_hasta: string | null;
  motivo: string | null;
  created_at: string;
}

/** Estado del RNT para vender: vigente, por vencer (≤ 30 días), vencido o sin vigencia. */

/** Estado del RNT para vender: vigente, por vencer (≤ 30 días), vencido o sin vigencia. */
export type EstadoVigencia = 'vigente' | 'por_vencer' | 'vencido' | 'sin_vigencia';

export function estadoVigencia(a: Pick<Agency, 'rnt_vigente_hasta'>, hoy = new Date()): EstadoVigencia {
  const dias = diasParaVencer(a, hoy);
  if (dias === null) return 'sin_vigencia';
  if (dias < 0) return 'vencido';
  if (dias <= 30) return 'por_vencer';
  return 'vigente';
}

/**
 * Días de calendario entre hoy y el último día de vigencia, contados con la fecha de Bogotá (UTC−5): el mismo día que
 * ven las salidas, sin importar la zona del navegador. 0 el día del vencimiento, negativo si ya venció.
 */
export function diasParaVencer(a: Pick<Agency, 'rnt_vigente_hasta'>, hoy = new Date()): number | null {
  if (!a.rnt_vigente_hasta) return null;
  return (diaUTC(a.rnt_vigente_hasta) - diaUTC(fechaBogota(hoy))) / 86_400_000;
}

/** Medianoche UTC de un `yyyy-mm-dd`: restar dos de ellas da días enteros, sin saltos de horario de verano. */
const diaUTC = (iso: string): number => {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};

/** Vigencia sugerida al verificar: 31 de marzo del año siguiente. */
export function vigenciaSugerida(hoy = new Date()): string {
  return `${hoy.getFullYear() + 1}-03-31`;
}
