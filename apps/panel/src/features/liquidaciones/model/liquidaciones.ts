/**
 * Liquidaciones y cuenta para dispersiones. MODO PRUEBA: ejecutar una liquidación solo la
 * marca «pagada_prueba» con una referencia PRUEBA-…; no se mueve dinero real.
 */

export const AVISO_PRUEBA = 'Dispersión de prueba — no se mueve dinero real';

export type TipoLiquidacion = 'semanal' | 'anticipo';
/** compensada: su saldo ≤ 0 se descontó en otra liquidación. sin_saldo: a pagar exactamente 0. */
export type EstadoLiquidacion = 'pendiente' | 'pagada_prueba' | 'anulada' | 'compensada' | 'sin_saldo';
export type TipoItem = 'servicio' | 'anticipo' | 'retencion' | 'ajuste' | 'saldo_anterior';

export interface Liquidacion {
  id: string;
  agency_id: string;
  tipo: TipoLiquidacion;
  periodo_inicio: string; // yyyy-mm-dd
  periodo_fin: string;
  monto_bruto: number;
  comision: number;
  monto_neto: number;
  anticipos_descontados: number;
  monto_a_pagar: number;
  estado: EstadoLiquidacion;
  /** Liquidación que absorbió el saldo de esta (solo si estado = 'compensada'). */
  compensada_en: string | null;
  referencia_prueba: string | null;
  ejecutada_at: string | null;
  created_at: string;
  /** Embebido por el admin: select('*, agencies(nombre)'). */
  agencies?: { nombre: string } | null;
}

export interface LiquidacionItem {
  id: string;
  liquidacion_id: string;
  /** null en el saldo de una liquidación anterior. */
  booking_id: string | null;
  tipo: TipoItem;
  monto_bruto: number;
  comision: number;
  monto_neto: number;
  bookings?: {
    codigo: string;
    pax: number;
    plan_dates?: { fecha: string; plans?: { titulo: string } | null } | null;
  } | null;
}

export interface LiquidacionDetalle extends Liquidacion {
  liquidacion_items: LiquidacionItem[];
}

export type TipoCuenta = 'ahorros' | 'corriente';
export type TipoDocumento = 'CC' | 'CE' | 'NIT' | 'PP';

/** Lo que escribe la agencia (solo ella y el admin pueden leer el número completo). */
export interface CuentaDispersion {
  banco: string;
  tipo_cuenta: TipoCuenta;
  numero_cuenta: string;
  titular: string;
  tipo_documento: TipoDocumento;
  numero_documento: string;
}

/** Lo que se muestra en listas: la vista del backend solo trae los 4 últimos dígitos. */
export interface CuentaResumen {
  agency_id: string;
  banco: string;
  tipo_cuenta: TipoCuenta;
  ultimos4: string;
  titular: string;
  updated_at: string;
}

export const TIPOS_CUENTA: { valor: TipoCuenta; etiqueta: string }[] = [
  { valor: 'ahorros', etiqueta: 'Ahorros' },
  { valor: 'corriente', etiqueta: 'Corriente' },
];

export const TIPOS_DOCUMENTO: { valor: TipoDocumento; etiqueta: string }[] = [
  { valor: 'NIT', etiqueta: 'NIT' },
  { valor: 'CC', etiqueta: 'Cédula de ciudadanía' },
  { valor: 'CE', etiqueta: 'Cédula de extranjería' },
  { valor: 'PP', etiqueta: 'Pasaporte' },
];

/** Sugerencias para el campo «Banco» (se puede escribir otro). */
export const BANCOS = [
  'Bancolombia',
  'Davivienda',
  'Banco de Bogotá',
  'BBVA',
  'Banco de Occidente',
  'Banco Popular',
  'AV Villas',
  'Scotiabank Colpatria',
  'Itaú',
  'Nequi',
  'Daviplata',
];

/* Etiquetas ------------------------------------------------------------ */

export function etiquetaTipoLiquidacion(t: string): string {
  return t === 'semanal' ? 'Semanal' : t === 'anticipo' ? 'Anticipo' : t;
}

export function etiquetaEstadoLiquidacion(e: string): string {
  return e === 'pendiente'
    ? 'Pendiente'
    : e === 'pagada_prueba'
      ? 'Pagada (prueba)'
      : e === 'anulada'
        ? 'Anulada'
        : e === 'compensada'
          ? 'Compensada'
          : e === 'sin_saldo'
            ? 'Sin saldo'
            : e;
}

/** Solo una pendiente con saldo a favor se dispersa; las demás se resuelven solas. */
export function puedeEjecutarse(l: Pick<Liquidacion, 'estado' | 'monto_a_pagar'>): boolean {
  return l.estado === 'pendiente' && l.monto_a_pagar > 0;
}

/** Qué pasa con una liquidación que no se ejecuta (null si es una normal). */
export function notaEstado(l: Pick<Liquidacion, 'estado' | 'monto_a_pagar'>): string | null {
  if (l.estado === 'pendiente' && l.monto_a_pagar <= 0) {
    return 'Saldo negativo: se descontará automáticamente de la próxima liquidación semanal.';
  }
  if (l.estado === 'sin_saldo') return 'Sin saldo por dispersar: los anticipos ya cubrieron este periodo.';
  if (l.estado === 'compensada') return 'Compensada: su saldo se descontó en otra liquidación.';
  return null;
}

export function etiquetaTipoCuenta(t: string): string {
  return TIPOS_CUENTA.find((x) => x.valor === t)?.etiqueta ?? t;
}

/** «Bancolombia · Ahorros •••• 4321» (nunca más que los 4 últimos dígitos). */
export function textoCuenta(c: CuentaResumen | null | undefined): string {
  return c ? `${c.banco} · ${etiquetaTipoCuenta(c.tipo_cuenta)} •••• ${c.ultimos4}` : 'Sin cuenta registrada';
}

export type FiltroLiquidaciones = 'pendientes' | 'pagadas' | 'todas';

export function filtrarLiquidaciones(ls: Liquidacion[], filtro: FiltroLiquidaciones): Liquidacion[] {
  if (filtro === 'todas') return ls;
  const estado: EstadoLiquidacion = filtro === 'pendientes' ? 'pendiente' : 'pagada_prueba';
  return ls.filter((l) => l.estado === estado);
}

export function etiquetaTipoItem(t: string): string {
  return t === 'servicio'
    ? 'Servicio'
    : t === 'anticipo'
      ? 'Anticipo 30 %'
      : t === 'retencion'
        ? 'Retención por cancelación'
        : t === 'ajuste'
          ? 'Ajuste por reembolso'
          : t === 'saldo_anterior'
            ? 'Saldo de liquidación anterior'
            : t;
}

const AYUDA_TIPO_ITEM: Partial<Record<TipoItem, string>> = {
  retencion: 'lo que no se reembolsó al viajero por la cancelación, menos la comisión.',
  ajuste: 'devuelve un anticipo que el reembolso dejó sin respaldo.',
  saldo_anterior: 'absorbe una liquidación que quedó en cero o negativa.',
};

/** Qué significa un concepto que no es un servicio normal, en una frase que sigue a su nombre (null si no necesita). */
export function ayudaTipoItem(t: string): string | null {
  return AYUDA_TIPO_ITEM[t as TipoItem] ?? null;
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const aFecha = (iso: string) => new Date(iso + 'T12:00:00');

function diaMes(iso: string, conAnio: boolean): string {
  const [anio, mes, dia] = iso.split('-').map(Number);
  return `${dia} ${MESES[mes - 1]}${conAnio ? ` ${anio}` : ''}`;
}

/** «2 feb – 8 feb 2026», «4 feb 2026» o «29 dic 2025 – 4 ene 2026». */
export function periodoTexto(inicio: string, fin: string): string {
  if (inicio === fin) return diaMes(inicio, true);
  const mismoAnio = inicio.slice(0, 4) === fin.slice(0, 4);
  return `${diaMes(inicio, !mismoAnio)} – ${diaMes(fin, true)}`;
}

/* Cuenta para dispersiones ---------------------------------------------- */

/** «•••• 4321»: fuera del formulario nunca se muestra más que los 4 últimos dígitos. */
export function enmascararCuenta(numero: string | null | undefined): string {
  const digitos = (numero ?? '').replace(/\D/g, '');
  return digitos.length > 4 ? `•••• ${digitos.slice(-4)}` : '••••';
}

/** Deja los datos como los guarda la BD: sin espacios de más, cuenta solo con dígitos. */
export function normalizarCuenta(c: CuentaDispersion): CuentaDispersion {
  return {
    ...c,
    banco: c.banco.trim(),
    titular: c.titular.trim(),
    numero_cuenta: c.numero_cuenta.replace(/[\s-]/g, ''),
    numero_documento: c.numero_documento.replace(/[\s.]/g, ''),
  };
}

export type ErroresCuenta = Partial<Record<keyof CuentaDispersion, string>>;

/** Mismas reglas que los CHECK de agency_payout_accounts (se valida sobre la cuenta normalizada). */
export function validarCuenta(entrada: CuentaDispersion): ErroresCuenta {
  const c = normalizarCuenta(entrada);
  const e: ErroresCuenta = {};
  if (c.banco.length < 2 || c.banco.length > 80) e.banco = 'Indica el banco (entre 2 y 80 caracteres).';
  if (!TIPOS_CUENTA.some((t) => t.valor === c.tipo_cuenta)) e.tipo_cuenta = 'Elige el tipo de cuenta.';
  if (!/^\d+$/.test(c.numero_cuenta)) {
    e.numero_cuenta = 'El número de cuenta debe tener solo dígitos (se aceptan espacios y guiones).';
  } else if (c.numero_cuenta.length < 6 || c.numero_cuenta.length > 20) {
    e.numero_cuenta = 'El número de cuenta debe tener de 6 a 20 dígitos.';
  }
  if (c.titular.length < 3 || c.titular.length > 120) e.titular = 'Escribe el nombre del titular (mínimo 3 caracteres).';
  if (!TIPOS_DOCUMENTO.some((t) => t.valor === c.tipo_documento)) e.tipo_documento = 'Elige el tipo de documento.';
  if (!/^[0-9A-Za-z-]{4,20}$/.test(c.numero_documento)) {
    e.numero_documento = 'El documento debe tener de 4 a 20 caracteres, sin puntos ni espacios (el NIT con guion).';
  }
  return e;
}

/* Totales y semanas ---------------------------------------------------- */

export function resumenLiquidaciones(ls: Liquidacion[]): { pendiente: number; pagadoPrueba: number } {
  const suma = (estado: EstadoLiquidacion) =>
    ls.filter((l) => l.estado === estado).reduce((s, l) => s + l.monto_a_pagar, 0);
  return { pendiente: suma('pendiente'), pagadoPrueba: suma('pagada_prueba') };
}

function aISO(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${dia}`;
}

/** Lunes de la semana (lunes a domingo) que contiene la fecha. */
export function lunesDeSemana(iso: string): string {
  const d = aFecha(iso);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return aISO(d);
}

export function rangoSemana(iso: string): { inicio: string; fin: string } {
  const inicio = lunesDeSemana(iso);
  const fin = aFecha(inicio);
  fin.setDate(fin.getDate() + 6);
  return { inicio, fin: aISO(fin) };
}

/** Lunes de la semana pasada: la que se liquida cada lunes. */
export function semanaAnterior(hoy = new Date()): string {
  const d = aFecha(lunesDeSemana(aISO(hoy)));
  d.setDate(d.getDate() - 7);
  return aISO(d);
}

/** Una semana solo se liquida cuando su domingo ya pasó (el backend lo exige con hora de Bogotá). */
export function semanaTerminada(iso: string, hoy = new Date()): boolean {
  return rangoSemana(iso).fin < aISO(hoy);
}
