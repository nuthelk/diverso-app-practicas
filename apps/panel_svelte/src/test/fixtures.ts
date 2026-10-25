import type { Agency, Plan, PlanDate, VentaRow } from '../lib/types';
import type { CuentaResumen, Liquidacion, LiquidacionItem } from '../lib/liquidaciones';

/** Texto visible normalizado (espacios, saltos de línea y NBSP → un espacio). */
export function texto(el: Element | null): string {
  return (el?.textContent ?? '').replace(/[\s\u00a0]+/g, ' ').trim();
}

export function agencia(parcial: Partial<Agency> = {}): Agency {
  return {
    id: 'ag-1',
    nombre: 'Aventuras Antioquia',
    numero_rnt: '123456',
    matricula_camara_comercio: '987654',
    ciudad: 'Medellín',
    telefono: '3001234567',
    email: 'hola@aventuras.co',
    whatsapp: '3001234567',
    descripcion: '',
    comision_pct: 12,
    estado_verificacion: 'verificado',
    rnt_vigente_hasta: '2027-03-31',
    verificado_at: null,
    motivo_rechazo: null,
    ...parcial,
  };
}

export function fecha(parcial: Partial<PlanDate> & Pick<PlanDate, 'fecha'>): PlanDate {
  return { id: `fecha-${parcial.fecha}`, plan_id: 'plan', cupo_total: 10, cupo_disponible: 10, ...parcial };
}

export function plan(titulo: string, fechas: PlanDate[]): Plan {
  return {
    id: titulo,
    agency_id: 'ag-1',
    titulo,
    destino: 'Antioquia',
    categoria: 'aventura',
    resumen: '',
    descripcion: '',
    duracion_texto: '1 día',
    punto_encuentro: '',
    precio_cop: 100000,
    incluye: [],
    incluye_transporte: true,
    incluye_comida: false,
    incluye_hospedaje: false,
    itinerario: [],
    politica_cancelacion: '',
    horas_cancelacion_gratuita: 48,
    horas_reembolso_parcial: null,
    porcentaje_reembolso_parcial: null,
    hora_salida: '06:00:00',
    fotos: [],
    estado: 'publicado',
    rating_promedio: 4.5,
    reviews_count: 3,
    agencies: null,
    plan_dates: fechas,
  };
}

export function venta(parcial: Partial<VentaRow> & Pick<VentaRow, 'booking_id'>): VentaRow {
  return {
    codigo: `DV-${parcial.booking_id}`,
    plan_titulo: 'Guatapé',
    fecha: '2026-10-30',
    pax: 2,
    monto_total: 100000,
    comision: 12000,
    saldo_agencia: 88000,
    booking_estado: 'confirmada',
    pago_estado: 'aprobado',
    referencia: null,
    ...parcial,
  };
}

export function liquidacion(parcial: Partial<Liquidacion> = {}): Liquidacion {
  return {
    id: 'liq-1',
    agency_id: 'ag-1',
    tipo: 'semanal',
    periodo_inicio: '2026-02-02',
    periodo_fin: '2026-02-08',
    monto_bruto: 400000,
    comision: 48000,
    monto_neto: 352000,
    anticipos_descontados: 79200,
    monto_a_pagar: 272800,
    estado: 'pendiente',
    compensada_en: null,
    referencia_prueba: null,
    ejecutada_at: null,
    created_at: '2026-02-09T11:00:00Z',
    ...parcial,
  };
}

export function itemLiquidacion(parcial: Partial<LiquidacionItem> = {}): LiquidacionItem {
  return {
    id: 'it-1',
    liquidacion_id: 'liq-1',
    booking_id: 'bk-1',
    tipo: 'servicio',
    monto_bruto: 100000,
    comision: 12000,
    monto_neto: 88000,
    bookings: { codigo: 'DV-AAAA', pax: 2, plan_dates: { fecha: '2026-02-04', plans: { titulo: 'Guatapé' } } },
    ...parcial,
  };
}

export function cuentaResumen(parcial: Partial<CuentaResumen> = {}): CuentaResumen {
  return {
    agency_id: 'ag-1',
    banco: 'Bancolombia',
    tipo_cuenta: 'ahorros',
    ultimos4: '4321',
    titular: 'EcoAndes SAS',
    updated_at: '2026-02-01T10:00:00Z',
    ...parcial,
  };
}

/** Hoy fijo para los tests que dependen de la fecha: domingo 25-oct-2026, 12:00 locales. */
export const HOY = new Date(2026, 9, 25, 12, 0, 0);
