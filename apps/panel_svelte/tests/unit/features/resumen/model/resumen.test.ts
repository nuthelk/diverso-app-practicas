import { describe, expect, it } from 'vitest';
import {
  avisosResumen,
  desdeResumen,
  dineroDelMes,
  estadoCabecera,
  lineaProximoPago,
  proximoPago,
  resumenDelMes,
  URL_RENOVAR_RNT,
} from '$lib/features/resumen/model/resumen';
import { aFecha, diaCorto, diaLargo, fechaConAnio, rangoTexto, sumarDias } from '$lib/features/resumen/model/fechas';
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

  it('fechaConAnio: «31 mar 2027»', () => {
    expect(fechaConAnio('2027-03-31')).toBe('31 mar 2027');
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

describe('resumenDelMes', () => {
  const ventas = [
    venta({ booking_id: 'a', fecha: '2026-10-30', monto_total: 200000, comision: 24000, saldo_agencia: 176000 }),
    venta({
      booking_id: 'b',
      fecha: '2026-10-02',
      booking_estado: 'completada',
      monto_total: 100000,
      comision: 12000,
      saldo_agencia: 88000,
    }),
    venta({ booking_id: 'c', fecha: '2026-11-01' }), // otro mes
    venta({ booking_id: 'd', fecha: '2026-10-30', booking_estado: 'pendiente_pago' }),
    venta({ booking_id: 'e', fecha: '2026-10-30', booking_estado: 'cancelada' }),
    venta({ booking_id: 'f', fecha: '2025-10-30' }), // mismo mes, otro año
  ];

  it('suma lo pagado de los viajes del mes en curso y nombra el mes', () => {
    expect(resumenDelMes(ventas, HOY)).toEqual({
      mes: 'octubre',
      vendido: 300000,
      comision: 36000,
      aRecibir: 264000,
      reservas: 2,
    });
  });

  it('sin ventas todo es cero', () => {
    expect(resumenDelMes([], HOY)).toEqual({ mes: 'octubre', vendido: 0, comision: 0, aRecibir: 0, reservas: 0 });
  });

  it('el mes es el de Bogotá, no el del navegador', () => {
    // 31-oct 21:00 en Bogotá = 1-nov 02:00 UTC: en un navegador adelantado ya sería noviembre.
    const ahora = new Date(Date.UTC(2026, 10, 1, 2, 0, 0));
    for (const zona of ZONAS) {
      expect(enZona(zona, () => resumenDelMes(ventas, ahora).mes), zona).toBe('octubre');
    }
  });
});

describe('dineroDelMes y lineaProximoPago', () => {
  const ventas = [
    venta({ booking_id: 'a', fecha: '2026-10-30', monto_total: 6981000, comision: 837720, saldo_agencia: 6143280 }),
  ];

  it('«te corresponde» y, en chico, lo vendido y la comisión de la agencia', () => {
    expect(dineroDelMes(ventas, 12, HOY)).toEqual({
      monto: cop(6143280),
      desglose: `Vendiste ${cop(6981000)} en octubre · comisión del 12 % (${cop(837720)})`,
    });
  });

  it('la comisión sale de la agencia, no de un 12 fijo', () => {
    expect(dineroDelMes(ventas, 15, HOY).desglose).toContain('comisión del 15 %');
  });

  it('sin ventas dice por qué es cero', () => {
    expect(dineroDelMes([], 12, HOY)).toEqual({
      monto: cop(0),
      desglose: 'Todavía no hay reservas pagadas en los viajes de octubre.',
    });
  });

  it('próximo pago: día corto y monto, o una frase simple si no hay o no se pudo consultar', () => {
    expect(lineaProximoPago({ fecha: '2026-11-09', monto: 2151600 }, true)).toEqual({
      texto: 'Próximo pago: lun 9 nov ·',
      monto: cop(2151600),
    });
    expect(lineaProximoPago(null, true)).toEqual({
      texto: 'Próximo pago: no tienes pagos pendientes por ahora.',
      monto: null,
    });
    expect(lineaProximoPago(null, false)).toEqual({ texto: 'No pudimos consultar tus pagos ahora.', monto: null });
  });
});

describe('desdeResumen', () => {
  it('pide los viajes desde el primer día del mes de Bogotá', () => {
    expect(desdeResumen(HOY)).toBe('2026-10-01');
    expect(desdeResumen(new Date(Date.UTC(2026, 10, 1, 2, 0, 0)))).toBe('2026-10-01'); // aún 31-oct en Bogotá
    expect(desdeResumen(new Date(Date.UTC(2026, 10, 1, 6, 0, 0)))).toBe('2026-11-01');
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

describe('estadoCabecera', () => {
  it.each([
    [{ estado_verificacion: 'rechazado' as const }, 'rechazado', ''],
    [{ estado_verificacion: 'pendiente' as const }, 'en_verificacion', ''],
    [{ rnt_vigente_hasta: '2027-03-31' }, 'vigente', 'hasta el 31 mar 2027'],
    [{ rnt_vigente_hasta: '2026-11-14' }, 'por_vencer', 'hasta el 14 nov 2026'],
    [{ rnt_vigente_hasta: '2026-01-01' }, 'vencido', 'venció el 1 ene 2026'],
    [{ rnt_vigente_hasta: null }, 'sin_vigencia', ''],
  ])('agencia %j', (parcial, estado, detalle) => {
    expect(estadoCabecera(agencia(parcial), HOY)).toEqual({ estado, detalle });
  });
});
