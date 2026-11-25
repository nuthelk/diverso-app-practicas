/** Lógica pura de ventas y conciliación (Resumen y Ventas). */

/** Fila de la vista `agency_sales`: una reserva con su pago, comisión y saldo para la agencia. */
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

export type FiltroVentas = 'todas' | 'confirmadas' | 'pendientes';

/** Ventas efectivas: reservas pagadas, ya sea por viajar (confirmada) o realizadas (completada). */
export function ventasPagadas(ventas: VentaRow[]): VentaRow[] {
  return ventas.filter((v) => v.booking_estado === 'confirmada' || v.booking_estado === 'completada');
}

/** Totales de un conjunto de ventas: monto, comisión de Diverso y saldo de la agencia. */
export function totalesVentas(ventas: VentaRow[]): { total: number; comision: number; saldo: number } {
  return {
    total: ventas.reduce((s, v) => s + v.monto_total, 0),
    comision: ventas.reduce((s, v) => s + v.comision, 0),
    saldo: ventas.reduce((s, v) => s + v.saldo_agencia, 0),
  };
}

export function filtrarVentas(ventas: VentaRow[], filtro: FiltroVentas): VentaRow[] {
  return filtro === 'confirmadas'
    ? ventasPagadas(ventas)
    : filtro === 'pendientes'
      ? ventas.filter((v) => v.booking_estado === 'pendiente_pago')
      : ventas;
}
