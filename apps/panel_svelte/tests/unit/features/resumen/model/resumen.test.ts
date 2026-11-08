import { describe, expect, it } from 'vitest';
import {
  avisosResumen,
  cifrasDelPeriodo,
  kpiProximoPago,
  kpisDelPeriodo,
  proximoPago,
  URL_RENOVAR_RNT,
} from '$lib/features/resumen/model/resumen';
import { aFecha, diaCorto, diaLargo, rangoTexto, sumarDias } from '$lib/features/resumen/model/fechas';
import { periodoDeDia, periodoDeRango } from '$lib/features/resumen/model/periodo';
import type { Salida } from '$lib/features/resumen/model/salidas';
import { cop } from '$lib/shared/lib/format';
import { agencia, enZona, fecha, HOY, liquidacion, plan, venta } from '$tests/fixtures';

/** 21:00 en Bogotá del domingo 25-oct = 02:00 UTC del lunes 26: un navegador adelantado ya ve el lunes. */
const DOMINGO_NOCHE = new Date(Date.UTC(2026, 9, 26, 2, 0, 0));
const ZONAS = ['America/Bogota', 'Asia/Tokyo', 'Pacific/Kiritimati', 'America/Los_Angeles'];

describe('fechas en español', () => {
  it('diaLargo: día de la semana con mayúscula, día y mes (largo o corto)', () => {
    expect(diaLargo('2026-11-05')).toBe('Jueves 5 de noviembre');
    expect(diaLargo('2026-11-09', 'corto')).toBe('Lunes 9 de nov');
    expect(diaLargo('2026-10-25')).toBe('Domingo 25 de octubre');
  });

  it('diaCorto: «lun 9 nov»', () => {
    expect(diaCorto('2026-11-09')).toBe('lun 9 nov');
    expect(diaCorto('2026-12-20')).toBe('dom 20 dic');
  });

  it('rangoTexto: un mes o dos', () => {
    expect(rangoTexto('2026-11-02', '2026-11-08')).toBe('Del 2 al 8 de noviembre');
    expect(rangoTexto('2026-10-26', '2026-11-01')).toBe('Del 26 de octubre al 1 de noviembre');
  });

  it('sumarDias cruza de mes y de año sin depender de la zona', () => {
    for (const zona of ZONAS) {
      expect(enZona(zona, () => sumarDias('2026-10-31', 1)), zona).toBe('2026-11-01');
      expect(enZona(zona, () => sumarDias('2026-12-31', 1)), zona).toBe('2027-01-01');
      expect(enZona(zona, () => aFecha('2026-11-05').getDate()), zona).toBe(5);
    }
  });
});

describe('proximoPago', () => {
  const liqs = [
    liquidacion({ id: 'l1', monto_a_pagar: 272800 }),
    liquidacion({ id: 'l2', monto_a_pagar: 100000 }),
    liquidacion({ id: 'l3', monto_a_pagar: -5000 }), // saldo negativo: no se dispersa
    liquidacion({ id: 'l4', estado: 'pagada_prueba', monto_a_pagar: 999999 }),
    liquidacion({ id: 'l5', estado: 'compensada', monto_a_pagar: 50000 }),
  ];

  it('suma las pendientes con saldo a favor y lo paga el próximo lunes', () => {
    expect(proximoPago(liqs, HOY)).toEqual({ fecha: '2026-10-26', monto: 372800 }); // HOY es domingo
  });

  it('si hoy es lunes, el pago es hoy; si es martes, el lunes siguiente', () => {
    expect(proximoPago(liqs, new Date(2026, 9, 26, 9))?.fecha).toBe('2026-10-26');
    expect(proximoPago(liqs, new Date(2026, 9, 27, 9))?.fecha).toBe('2026-11-02');
  });

  it('cuenta el lunes desde el día de Bogotá aunque el navegador ya esté en el lunes', () => {
    for (const zona of ZONAS) {
      expect(enZona(zona, () => proximoPago(liqs, DOMINGO_NOCHE))?.fecha, zona).toBe('2026-10-26');
    }
    // El lunes 26 a las 21:00 en Bogotá (martes 02:00 UTC) todavía es lunes: el pago es hoy.
    const lunesNoche = new Date(Date.UTC(2026, 9, 27, 2, 0, 0));
    for (const zona of ZONAS) {
      expect(enZona(zona, () => proximoPago(liqs, lunesNoche))?.fecha, zona).toBe('2026-10-26');
    }
  });

  it('sin pendientes con saldo no hay próximo pago', () => {
    expect(proximoPago([], HOY)).toBeNull();
    expect(proximoPago(liqs.slice(2), HOY)).toBeNull();
  });
});

describe('avisosResumen', () => {
  const planes = [plan('Guatapé', [fecha({ fecha: '2026-11-01' })])];
  const claves = (a: ReturnType<typeof avisosResumen>) => a.map((x) => x.clave);

  it('agencia al día: ningún aviso', () => {
    expect(avisosResumen({ agencia: agencia(), planes, hayCuenta: true, hoy: HOY })).toEqual([]);
  });

  it('RNT por vencer: urgente, con los días restantes y «Renovar RNT»', () => {
    const [a] = avisosResumen({
      agencia: agencia({ rnt_vigente_hasta: '2026-11-14' }),
      planes,
      hayCuenta: true,
      hoy: HOY,
    });
    // Mismo texto que el banner de las demás secciones: dice qué hacer, no solo qué pasa.
    expect(a).toMatchObject({
      clave: 'rnt',
      tono: 'alerta',
      urgente: true,
      etiqueta: 'Urgente · en 20 días',
      texto: 'Tu RNT vence el 14 de noviembre de 2026 (en 20 días). Renuévalo a tiempo para no dejar de vender.',
      accion: { texto: 'Renovar RNT', url: URL_RENOVAR_RNT },
    });
  });

  it('la etiqueta del RNT dice hoy, mañana o los días', () => {
    const et = (hasta: string) =>
      avisosResumen({ agencia: agencia({ rnt_vigente_hasta: hasta }), planes, hayCuenta: true, hoy: HOY })[0].etiqueta;
    expect(et('2026-10-25')).toBe('Urgente · hoy');
    expect(et('2026-10-26')).toBe('Urgente · mañana');
    expect(et('2026-10-30')).toBe('Urgente · en 5 días');
  });

  it('RNT vencido o sin vigencia: urgente, error que explica que no se muestran los planes', () => {
    const v = avisosResumen({ agencia: agencia({ rnt_vigente_hasta: '2026-10-20' }), planes, hayCuenta: true, hoy: HOY });
    expect(v[0]).toMatchObject({ clave: 'rnt', tono: 'error', urgente: true, etiqueta: 'Urgente' });
    expect(v[0].texto).toContain('tus planes no se muestran');
    expect(v[0].texto).toContain('Renueva el registro y envíanos el soporte');
    expect(v[0].accion).toEqual({ texto: 'Renovar RNT', url: URL_RENOVAR_RNT });
    const s = avisosResumen({ agencia: agencia({ rnt_vigente_hasta: null }), planes, hayCuenta: true, hoy: HOY });
    expect(s[0]).toMatchObject({ clave: 'rnt', tono: 'error', urgente: true });
  });

  it('verificación pendiente: invita a preparar planes; rechazada: dice el motivo y es urgente', () => {
    const p = avisosResumen({ agencia: agencia({ estado_verificacion: 'pendiente' }), planes: [], hayCuenta: false, hoy: HOY });
    expect(claves(p)).toEqual(['verificacion']); // sin otros avisos mientras no esté verificada
    expect(p[0]).toMatchObject({ urgente: false, etiqueta: 'Pendiente' });
    expect(p[0].accion).toEqual({ texto: 'Crear un plan', ruta: '/planes/nuevo' });
    const r = avisosResumen({
      agencia: agencia({ estado_verificacion: 'rechazado', motivo_rechazo: 'RNT ilegible' }),
      planes,
      hayCuenta: true,
      hoy: HOY,
    });
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ clave: 'verificacion', tono: 'error', urgente: true, etiqueta: 'Urgente' });
    expect(r[0].texto).toContain('RNT ilegible');
    expect(r[0].texto).toContain('Corrige tus datos y escríbenos');
  });

  it('si las salidas de hoy ya partieron y no hay otras, avisa que no hay salidas próximas', () => {
    const ahora = new Date(Date.UTC(2026, 10, 3, 2, 0, 0)); // lunes 21:00 en Bogotá
    const hoy = [plan('Guatapé', [fecha({ fecha: '2026-11-02' })])]; // sale 06:00
    const a = avisosResumen({ agencia: agencia(), planes: hoy, hayCuenta: true, hoy: ahora });
    expect(a[0]).toMatchObject({ clave: 'salidas', urgente: false, accion: { texto: 'Agregar fechas', ruta: '/planes' } });
  });

  it('sin salidas futuras: pide agregar fechas, o crear el primer plan si no hay planes', () => {
    const sinFechas = avisosResumen({
      agencia: agencia(),
      planes: [plan('Guatapé', [fecha({ fecha: '2025-01-01' })])],
      hayCuenta: true,
      hoy: HOY,
    });
    expect(sinFechas[0]).toMatchObject({ clave: 'salidas', accion: { texto: 'Agregar fechas', ruta: '/planes' } });
    const sinPlanes = avisosResumen({ agencia: agencia(), planes: [], hayCuenta: true, hoy: HOY });
    expect(sinPlanes[0]).toMatchObject({
      clave: 'salidas',
      accion: { texto: 'Crear tu primer plan', ruta: '/planes/nuevo' },
    });
  });

  it('sin cuenta para pagos: pendiente y lleva a registrarla; si no se pudo saber (null) no avisa', () => {
    const a = avisosResumen({ agencia: agencia(), planes, hayCuenta: false, hoy: HOY });
    expect(a[0]).toMatchObject({
      clave: 'cuenta',
      urgente: false,
      etiqueta: 'Pendiente',
      accion: { texto: 'Registrar cuenta', ruta: '/cuenta-dispersiones' },
    });
    expect(avisosResumen({ agencia: agencia(), planes, hayCuenta: null, hoy: HOY })).toEqual([]);
  });

  it('con RNT vencido no pide fechas (ya no se muestra nada) pero sí la cuenta; lo urgente va primero', () => {
    const a = avisosResumen({
      agencia: agencia({ rnt_vigente_hasta: '2026-10-20' }),
      planes: [],
      hayCuenta: false,
      hoy: HOY,
    });
    expect(claves(a)).toEqual(['rnt', 'cuenta']);
    expect(a.map((x) => x.urgente)).toEqual([true, false]);
  });

  it('orden: RNT urgente, luego salidas y cuenta (lo pendiente)', () => {
    const a = avisosResumen({
      agencia: agencia({ rnt_vigente_hasta: '2026-11-14' }),
      planes: [],
      hayCuenta: false,
      hoy: HOY,
    });
    expect(claves(a)).toEqual(['rnt', 'salidas', 'cuenta']);
  });
});

const salida = (parcial: Partial<Salida>): Salida => ({
  id: 's',
  planId: 'p',
  fecha: '2026-11-05',
  hora: '06:30',
  titulo: 'Río Claro',
  reservados: 0,
  total: 24,
  libres: 24,
  porcentaje: 0,
  yaSalio: false,
  hoy: false,
  pendientes: 0,
  vendido: 0,
  ...parcial,
});

describe('cifrasDelPeriodo', () => {
  const periodo = periodoDeRango('2026-11-05', '2026-11-12');
  const salidas = [
    salida({ id: 'a', reservados: 5, total: 24, yaSalio: true }),
    salida({ id: 'b', reservados: 7, total: 24 }),
    salida({ id: 'c', reservados: 0, total: 12 }),
  ];
  const ventas = [
    venta({ booking_id: '1', fecha: '2026-11-05', pax: 2, monto_total: 200000, comision: 24000, saldo_agencia: 176000 }),
    venta({ booking_id: '2', fecha: '2026-11-12', booking_estado: 'completada', monto_total: 100000, comision: 12000, saldo_agencia: 88000 }),
    venta({ booking_id: '3', fecha: '2026-11-06', pax: 3, booking_estado: 'pendiente_pago', monto_total: 330000 }),
    venta({ booking_id: '4', fecha: '2026-11-06', pax: 1, booking_estado: 'pendiente_pago', monto_total: 110000 }),
    venta({ booking_id: '5', fecha: '2026-11-06', booking_estado: 'cancelada' }),
    venta({ booking_id: '6', fecha: '2026-11-13' }), // fuera del período
    venta({ booking_id: '7', fecha: '2026-11-04' }), // fuera del período
  ];

  it('salidas, viajeros y ocupación salen de las salidas del período', () => {
    expect(cifrasDelPeriodo(salidas, [], periodo)).toMatchObject({
      salidas: 3,
      yaSalieron: 1,
      proximas: 2,
      viajeros: 12,
      cupos: 60,
      ocupacion: 20,
    });
  });

  it('lo pagado y lo pendiente salen de las ventas de los viajes del período, no de otras fechas ni canceladas', () => {
    expect(cifrasDelPeriodo(salidas, ventas, periodo)).toMatchObject({
      vendido: 300000,
      comision: 36000,
      aRecibir: 264000,
      pendientes: 4,
      porCobrar: 440000,
    });
  });

  it('sin salidas ni ventas todo es cero (y la ocupación no divide por cero)', () => {
    expect(cifrasDelPeriodo([], [], periodoDeDia('2026-11-05'))).toEqual({
      salidas: 0,
      yaSalieron: 0,
      proximas: 0,
      viajeros: 0,
      cupos: 0,
      ocupacion: 0,
      pendientes: 0,
      porCobrar: 0,
      vendido: 0,
      comision: 0,
      aRecibir: 0,
    });
  });
});

describe('kpisDelPeriodo', () => {
  const kpis = (parcial: Parameters<typeof kpisDelPeriodo>[0], pct = 12) => Object.fromEntries(kpisDelPeriodo(parcial, pct).map((k) => [k.clave, k]));
  const vacias = cifrasDelPeriodo([], [], periodoDeDia('2026-11-05'));

  it('las cuatro cifras del período, en orden, con su alcance', () => {
    const c = {
      ...vacias,
      salidas: 12,
      yaSalieron: 5,
      proximas: 7,
      viajeros: 48,
      cupos: 288,
      ocupacion: 17,
      pendientes: 2,
      porCobrar: 330000,
      vendido: 6981000,
      comision: 837720,
      aRecibir: 6143280,
    };
    expect(kpisDelPeriodo(c, 12).map((k) => k.clave)).toEqual(['salidas', 'viajeros', 'pendientes', 'corresponde']);
    const k = kpis(c);
    expect([k.salidas.etiqueta, k.salidas.valor, k.salidas.sub]).toEqual(['Salidas', '12', '5 ya salieron · 7 próximas']);
    expect([k.viajeros.etiqueta, k.viajeros.valor, k.viajeros.sub]).toEqual(['Viajeros', '48', '17 % de 288 cupos']);
    expect([k.pendientes.etiqueta, k.pendientes.valor, k.pendientes.sub, k.pendientes.tono]).toEqual([
      'Pagos pendientes',
      '2 personas',
      `${cop(330000)} por cobrar`,
      'alerta',
    ]);
    expect([k.corresponde.etiqueta, k.corresponde.valor, k.corresponde.sub, k.corresponde.principal]).toEqual([
      'Te corresponde',
      cop(6143280),
      `Vendido ${cop(6981000)} · comisión 12 %`,
      true,
    ]);
  });

  it('la comisión sale de la agencia, no de un 12 fijo', () => {
    expect(kpis({ ...vacias, vendido: 1000 }, 15).corresponde.sub).toContain('comisión 15 %');
  });

  it('singulares', () => {
    const k = kpis({ ...vacias, salidas: 2, yaSalieron: 1, proximas: 1, pendientes: 1, porCobrar: 5000 });
    expect(k.salidas.sub).toBe('1 ya salió · 1 próxima');
    expect(k.pendientes.valor).toBe('1 persona');
  });

  it('sin nada dice por qué es cero, y sin pendientes dice que todo está pagado', () => {
    const k = kpis(vacias);
    expect(k.salidas).toMatchObject({ valor: '0', sub: 'Sin salidas en el período' });
    expect(k.viajeros).toMatchObject({ valor: '0', sub: 'Sin cupos en el período' });
    expect(k.pendientes).toMatchObject({ valor: '0 personas', sub: 'Todo pagado', tono: 'neutro' });
    expect(k.corresponde).toMatchObject({ valor: cop(0), sub: 'Aún sin reservas pagadas' });
  });
});

describe('kpiProximoPago', () => {
  it('el día y el monto, o una frase simple si no hay o no se pudo consultar', () => {
    expect(kpiProximoPago({ fecha: '2026-11-09', monto: 2151600 }, true)).toEqual({
      etiqueta: 'Próximo pago',
      valor: 'lun 9 nov',
      sub: cop(2151600),
    });
    expect(kpiProximoPago(null, true)).toEqual({
      etiqueta: 'Próximo pago',
      valor: 'Sin pagos',
      sub: 'No tienes pagos pendientes por ahora.',
    });
    expect(kpiProximoPago(null, false)).toEqual({
      etiqueta: 'Próximo pago',
      valor: '—',
      sub: 'No pudimos consultar tus pagos ahora.',
    });
  });
});
