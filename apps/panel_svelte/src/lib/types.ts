/** Tipos y parseo de las tablas que consume el panel (mismo backend). */

export type VerificationStatus = 'pendiente' | 'verificado' | 'rechazado';
export type PlanStatus = 'borrador' | 'publicado';

export interface Agency {
  id: string;
  nombre: string;
  numero_rnt: string;
  matricula_camara_comercio: string;
  ciudad: string;
  telefono: string;
  email: string;
  whatsapp: string;
  descripcion: string;
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
export type EstadoVigencia = 'vigente' | 'por_vencer' | 'vencido' | 'sin_vigencia';

export function estadoVigencia(a: Pick<Agency, 'rnt_vigente_hasta'>, hoy = new Date()): EstadoVigencia {
  if (!a.rnt_vigente_hasta) return 'sin_vigencia';
  const h = new Date(hoy);
  h.setHours(0, 0, 0, 0);
  const v = new Date(a.rnt_vigente_hasta + 'T00:00:00');
  const dias = Math.round((v.getTime() - h.getTime()) / 86_400_000);
  if (dias < 0) return 'vencido';
  if (dias <= 30) return 'por_vencer';
  return 'vigente';
}

export function diasParaVencer(a: Pick<Agency, 'rnt_vigente_hasta'>, hoy = new Date()): number | null {
  if (!a.rnt_vigente_hasta) return null;
  const h = new Date(hoy);
  h.setHours(0, 0, 0, 0);
  const v = new Date(a.rnt_vigente_hasta + 'T00:00:00');
  return Math.round((v.getTime() - h.getTime()) / 86_400_000);
}

/** Vigencia sugerida al verificar: 31 de marzo del año siguiente. */
export function vigenciaSugerida(hoy = new Date()): string {
  return `${hoy.getFullYear() + 1}-03-31`;
}

export interface PlanDate {
  id: string;
  plan_id: string;
  fecha: string; // yyyy-mm-dd
  cupo_total: number;
  cupo_disponible: number;
}

export interface Plan {
  id: string;
  agency_id: string;
  titulo: string;
  destino: string;
  categoria: string;
  resumen: string;
  descripcion: string;
  duracion_texto: string;
  punto_encuentro: string;
  precio_cop: number;
  incluye: string[];
  incluye_transporte: boolean;
  incluye_comida: boolean;
  incluye_hospedaje: boolean;
  itinerario: { hora: string; actividad: string }[];
  politica_cancelacion: string;
  /** Frases del plan que no son política (el texto de arriba = política de los números + estas notas). */
  politica_notas: string;
  horas_cancelacion_gratuita: number;
  horas_reembolso_parcial: number | null;
  porcentaje_reembolso_parcial: number | null;
  /** time de Postgres: «06:00:00». */
  hora_salida: string;
  fotos: string[];
  estado: PlanStatus;
  rating_promedio: number;
  reviews_count: number;
  agencies: Agency | null;
  plan_dates: PlanDate[];
}

export interface VentaRow {
  booking_id: string;
  codigo: string;
  plan_titulo: string;
  fecha: string;
  pax: number;
  monto_total: number;
  comision: number;
  saldo_agencia: number;
  booking_estado: string;
  pago_estado: string | null;
  referencia: string | null;
}

export interface Profile {
  id: string;
  rol: 'viajero' | 'agencia' | 'admin';
  nombre: string;
}

export const CATEGORIAS = [
  { valor: 'aventura', label: 'Aventura', emoji: '🧭' },
  { valor: 'naturaleza', label: 'Naturaleza', emoji: '🌿' },
  { valor: 'cultura', label: 'Cultura', emoji: '🏘️' },
  { valor: 'gastronomia', label: 'Gastronomía', emoji: '🍽️' },
  { valor: 'relax', label: 'Relax', emoji: '💤' },
  { valor: 'urbano', label: 'Urbano', emoji: '🏙️' },
] as const;

export type CategoriaValor = (typeof CATEGORIAS)[number]['valor'];

export interface ItinerarioPaso {
  hora: string;
  actividad: string;
}

export interface PlanDraft {
  id: string | null;
  titulo: string;
  destino: string;
  categoria: CategoriaValor;
  precioCop: number;
  resumen: string;
  descripcion: string;
  duracionTexto: string;
  puntoEncuentro: string;
  incluye: string[];
  incluyeTransporte: boolean;
  incluyeComida: boolean;
  incluyeHospedaje: boolean;
  itinerario: ItinerarioPaso[];
  /** Texto derivado de los números de abajo y de las notas (lo genera conPoliticaGenerada al guardar). */
  politicaCancelacion: string;
  /** Frases opcionales que no son política (p. ej. «Avisar restricciones alimentarias.»); van tras el texto generado. */
  politicaNotas: string;
  horasCancelacionGratuita: number;
  horasReembolsoParcial: number | null;
  porcentajeReembolsoParcial: number | null;
  /** HH:MM, hora de Colombia: base de la ventana de cancelación. */
  horaSalida: string;
  fotos: string[];
}

export function draftVacio(): PlanDraft {
  return {
    id: null,
    titulo: '',
    destino: '',
    categoria: 'aventura',
    precioCop: 0,
    resumen: '',
    descripcion: '',
    duracionTexto: '1 día',
    puntoEncuentro: '',
    incluye: [],
    incluyeTransporte: true,
    incluyeComida: false,
    incluyeHospedaje: false,
    itinerario: [],
    politicaCancelacion: '',
    politicaNotas: '',
    horasCancelacionGratuita: 48,
    horasReembolsoParcial: null,
    porcentajeReembolsoParcial: null,
    horaSalida: '06:00',
    fotos: [],
  };
}

function duracionHoras(texto: string): number {
  const t = texto.toLowerCase();
  const m = /(\d+(?:[.,]\d+)?)/.exec(t);
  const n = m ? parseFloat(m[1].replace(',', '.')) : null;
  if (t.includes('minuto')) return n ? Math.round((n / 60) * 100) / 100 : 0.5;
  if (t.includes('hora')) return n ?? 4;
  if (t.includes('día') || t.includes('dia')) return n === 2 ? 40 : (n ?? 1) * 12;
  return 12;
}

export function draftToRow(d: PlanDraft) {
  return {
    titulo: d.titulo,
    destino: d.destino,
    categoria: d.categoria,
    precio_cop: d.precioCop,
    resumen: d.resumen,
    descripcion: d.descripcion,
    duracion_texto: d.duracionTexto,
    duracion_horas: duracionHoras(d.duracionTexto),
    punto_encuentro: d.puntoEncuentro,
    incluye: d.incluye,
    incluye_transporte: d.incluyeTransporte,
    incluye_comida: d.incluyeComida,
    incluye_hospedaje: d.incluyeHospedaje,
    itinerario: d.itinerario,
    politica_cancelacion: d.politicaCancelacion,
    politica_notas: d.politicaNotas ?? '',
    horas_cancelacion_gratuita: d.horasCancelacionGratuita,
    // Un campo numérico vacío llega como undefined: la BD necesita null para borrar el tramo parcial.
    horas_reembolso_parcial: d.horasReembolsoParcial ?? null,
    porcentaje_reembolso_parcial: d.porcentajeReembolsoParcial ?? null,
    hora_salida: d.horaSalida,
    fotos: d.fotos,
  };
}

/** Fechas futuras con cupos, ordenadas (mismas reglas que el panel Flutter). */
export function fechasFuturas(plan: Plan, ahora = new Date()): PlanDate[] {
  const hoy = new Date(ahora);
  hoy.setHours(0, 0, 0, 0);
  return plan.plan_dates
    .filter((d) => new Date(d.fecha + 'T00:00:00') >= hoy && d.cupo_disponible > 0)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}
