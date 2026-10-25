/** Lógica pura de ventas y conciliación (Dashboard y Ventas). */

import type { VentaRow } from './types';

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
