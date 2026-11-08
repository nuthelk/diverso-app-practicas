import { describe, expect, it } from 'vitest';
import {
  conteoPorFiltro,
  filtrarSalidas,
  filtroInicial,
  salidasDeAgencia,
  salidasDelPeriodo,
  textoMostrando,
  totalesDeSalidas,
  type Salida,
} from '$lib/features/resumen/model/salidas';
import { periodoDeDia, periodoDeRango } from '$lib/features/resumen/model/periodo';
import { fecha, plan, venta } from '$tests/fixtures';

/** Martes 3-nov-2026, 12:00 en Bogotá. */
const MARTES = new Date(Date.UTC(2026, 10, 3, 17, 0, 0));

const rio = {
  ...plan('Río Claro', [
    fecha({ id: 'rc3', fecha: '2026-11-03', cupo_total: 24, cupo_disponible: 20 }), // hoy 06:30: ya salió
    fecha({ id: 'rc5', fecha: '2026-11-05', cupo_total: 24, cupo_disponible: 19 }),
    fecha({ id: 'rc11', fecha: '2026-11-11', cupo_total: 24, cupo_disponible: 24 }),
  ]),
  id: 'rc',
  hora_salida: '06:30:00',
};
const san = {
  ...plan('San Rafael', [fecha({ id: 'sr5', fecha: '2026-11-05', cupo_total: 24, cupo_disponible: 22 })]),
  id: 'sr',
  hora_salida: '06:00:00',
};

describe('salidasDeAgencia', () => {
  const salidas = salidasDeAgencia([rio, san], MARTES);

  it('todas las salidas por fecha y hora, con lo reservado, lo libre y el porcentaje', () => {
    expect(salidas.map((s) => [s.id, s.fecha, s.hora])).toEqual([
      ['rc3', '2026-11-03', '06:30'],
      ['sr5', '2026-11-05', '06:00'],
      ['rc5', '2026-11-05', '06:30'],
      ['rc11', '2026-11-11', '06:30'],
    ]);
    expect(salidas.find((s) => s.id === 'rc5')).toMatchObject({
      planId: 'rc',
      titulo: 'Río Claro',
      reservados: 5,
      total: 24,
      libres: 19,
      porcentaje: 21,
      pendientes: 0,
      vendido: 0,
    });
  });

  it('marca la de hoy y las que ya partieron (hora de Bogotá)', () => {
    expect(salidas.filter((s) => s.hoy).map((s) => s.id)).toEqual(['rc3']);
    expect(salidas.filter((s) => s.yaSalio).map((s) => s.id)).toEqual(['rc3']);
  });

  it('un borrador solo aparece si ya tiene personas reservadas; el cupo se acota entre 0 y el total', () => {
    const borrador = {
      ...plan('Borrador', [
        fecha({ id: 'b1', fecha: '2026-11-09', cupo_total: 10, cupo_disponible: 10 }),
        fecha({ id: 'b2', fecha: '2026-11-10', cupo_total: 10, cupo_disponible: 7 }),
        fecha({ id: 'b3', fecha: '2026-11-12', cupo_total: 10, cupo_disponible: -3 }),
      ]),
      estado: 'borrador' as const,
    };
    const lista = salidasDeAgencia([borrador], MARTES);
    expect(lista.map((s) => [s.id, s.reservados])).toEqual([
      ['b2', 3],
      ['b3', 10],
    ]);
  });

  it('el «hoy» es el día de Bogotá aunque el navegador vaya adelantado', () => {
    const noche = new Date(Date.UTC(2026, 10, 6, 3, 0, 0)); // 5-nov 22:00 en Bogotá
    expect(salidasDeAgencia([rio, san], noche).filter((s) => s.hoy).map((s) => s.id)).toEqual(['sr5', 'rc5']);
  });
});

describe('salidasDelPeriodo', () => {
  const todas = salidasDeAgencia([rio, san], MARTES);
  const ventas = [
    venta({ booking_id: 'a', plan_titulo: 'Río Claro', fecha: '2026-11-05', pax: 2, monto_total: 400000 }),
    venta({ booking_id: 'b', plan_titulo: 'Río Claro', fecha: '2026-11-05', pax: 3, monto_total: 600000, booking_estado: 'pendiente_pago' }),
    venta({ booking_id: 'c', plan_titulo: 'Río Claro', fecha: '2026-11-05', pax: 1, monto_total: 100000, booking_estado: 'cancelada' }),
    venta({ booking_id: 'd', plan_titulo: 'Río Claro', fecha: '2026-11-05', pax: 1, monto_total: 150000, booking_estado: 'completada' }),
    venta({ booking_id: 'e', plan_titulo: 'San Rafael', fecha: '2026-11-05', pax: 2, monto_total: 300000 }),
  ];

  it('deja las salidas del período, extremos incluidos', () => {
    expect(salidasDelPeriodo(todas, [], periodoDeDia('2026-11-05')).map((s) => s.id)).toEqual(['sr5', 'rc5']);
    expect(salidasDelPeriodo(todas, [], periodoDeRango('2026-11-03', '2026-11-05')).map((s) => s.id)).toEqual(['rc3', 'sr5', 'rc5']);
    expect(salidasDelPeriodo(todas, [], periodoDeDia('2026-11-04'))).toEqual([]);
  });

  it('suma a cada salida lo vendido (pagado) y las personas pendientes de pago de su plan y su fecha', () => {
    const [san5, rio5] = salidasDelPeriodo(todas, ventas, periodoDeDia('2026-11-05'));
    expect([rio5.id, rio5.pendientes, rio5.vendido]).toEqual(['rc5', 3, 550000]); // pagado: confirmada + completada
    expect([san5.id, san5.pendientes, san5.vendido]).toEqual(['sr5', 0, 300000]);
  });

  it('las ventas de otras fechas no se cuelan', () => {
    const otras = [venta({ booking_id: 'z', plan_titulo: 'Río Claro', fecha: '2026-11-11', monto_total: 999 })];
    const [rio5] = salidasDelPeriodo(todas, otras, periodoDeDia('2026-11-05')).filter((s) => s.id === 'rc5');
    expect([rio5.pendientes, rio5.vendido]).toEqual([0, 0]);
  });

  it('no cambia las salidas de entrada', () => {
    salidasDelPeriodo(todas, ventas, periodoDeDia('2026-11-05'));
    expect(todas.every((s) => s.vendido === 0 && s.pendientes === 0)).toBe(true);
  });
});

describe('qué salidas ver', () => {
  const todas = salidasDeAgencia([rio, san], MARTES);

  it('próximas (aún no parten), ya salieron o todas', () => {
    expect(filtrarSalidas(todas, 'proximas').map((s) => s.id)).toEqual(['sr5', 'rc5', 'rc11']);
    expect(filtrarSalidas(todas, 'ya').map((s) => s.id)).toEqual(['rc3']);
    expect(filtrarSalidas(todas, 'todas')).toHaveLength(4);
  });

  it('cuenta cuántas tiene cada filtro', () => {
    expect(conteoPorFiltro(todas)).toEqual({ proximas: 3, ya: 1, todas: 4 });
    expect(conteoPorFiltro([])).toEqual({ proximas: 0, ya: 0, todas: 0 });
  });

  it('al elegir un período arranca en «próximas»; si no queda ninguna, en «ya salieron»', () => {
    expect(filtroInicial(todas)).toBe('proximas');
    expect(filtroInicial(todas.filter((s) => s.yaSalio))).toBe('ya');
    expect(filtroInicial([])).toBe('proximas');
  });
});

describe('totales y «mostrando»', () => {
  const lista = [
    { reservados: 5, pendientes: 2, vendido: 300000 },
    { reservados: 7, pendientes: 0, vendido: 120000 },
  ] as Salida[];

  it('totalesDeSalidas: salidas, viajeros, pendientes y vendido', () => {
    expect(totalesDeSalidas(lista)).toEqual({ salidas: 2, viajeros: 12, pendientes: 2, vendido: 420000 });
    expect(totalesDeSalidas([])).toEqual({ salidas: 0, viajeros: 0, pendientes: 0, vendido: 0 });
  });

  it('textoMostrando dice cuántas salidas se ven de cuántas hay', () => {
    expect(textoMostrando(12, 40)).toBe('Mostrando 12 de 40 salidas');
    expect(textoMostrando(5, 5)).toBe('Mostrando las 5 salidas de esta vista.');
    expect(textoMostrando(1, 1)).toBe('Mostrando la única salida de esta vista.');
    expect(textoMostrando(0, 0)).toBe('');
  });
});
