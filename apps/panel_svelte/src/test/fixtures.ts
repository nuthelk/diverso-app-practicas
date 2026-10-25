import type { Agency, Plan, PlanDate, VentaRow } from '../lib/types';

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

/** Hoy fijo para los tests que dependen de la fecha: domingo 25-oct-2026, 12:00 locales. */
export const HOY = new Date(2026, 9, 25, 12, 0, 0);
