import { describe, expect, it } from 'vitest';
import { filtrarVentas, totalesVentas, ventasPagadas } from '$lib/features/ventas/model/ventas';
import { venta } from '$tests/fixtures';

const lista = [
  venta({ booking_id: 'a', booking_estado: 'confirmada', monto_total: 200000, comision: 24000, saldo_agencia: 176000 }),
  venta({ booking_id: 'b', booking_estado: 'completada', monto_total: 100000, comision: 12000, saldo_agencia: 88000 }),
  venta({ booking_id: 'c', booking_estado: 'pendiente_pago', monto_total: 50000, comision: 6000, saldo_agencia: 44000 }),
  venta({ booking_id: 'd', booking_estado: 'cancelada', monto_total: 70000, comision: 8400, saldo_agencia: 61600 }),
];

const ids = (v: typeof lista) => v.map((x) => x.booking_id);

describe('ventasPagadas', () => {
  it('deja confirmadas y completadas', () => {
    expect(ids(ventasPagadas(lista))).toEqual(['a', 'b']);
  });

  it('sin ventas devuelve lista vacía', () => {
    expect(ventasPagadas([])).toEqual([]);
  });
});

describe('totalesVentas', () => {
  it('suma monto, comisión y saldo de las reservas pagadas', () => {
    expect(totalesVentas(ventasPagadas(lista))).toEqual({
      total: 300000,
      comision: 36000,
      saldo: 264000,
    });
  });

  it('sin ventas todo es cero', () => {
    expect(totalesVentas([])).toEqual({ total: 0, comision: 0, saldo: 0 });
  });
});

describe('filtrarVentas', () => {
  it('«todas» no filtra', () => {
    expect(ids(filtrarVentas(lista, 'todas'))).toEqual(['a', 'b', 'c', 'd']);
  });

  it('«confirmadas» equivale a las pagadas', () => {
    expect(ids(filtrarVentas(lista, 'confirmadas'))).toEqual(['a', 'b']);
  });

  it('«pendientes» deja solo pendiente_pago', () => {
    expect(ids(filtrarVentas(lista, 'pendientes'))).toEqual(['c']);
  });
});
