import { describe, expect, it } from 'vitest';
import {
  avisosResumen,
  etiquetaDia,
  proximoPago,
  proximasSalidasPorFecha,
  resumenDelMes,
  textoDia,
} from './resumen';
import { agencia, fecha, HOY, liquidacion, plan, venta } from '@/test/fixtures';

describe('textoDia / etiquetaDia', () => {
  it('textoDia: día de la semana, día y mes abreviados', () => {
    expect(textoDia('2026-11-01')).toBe('dom 1 nov');
    expect(textoDia('2026-12-24')).toBe('jue 24 dic');
  });

  it('etiquetaDia: Hoy, Mañana y luego la fecha con la inicial en mayúscula', () => {
    expect(etiquetaDia('2026-10-25', HOY)).toBe('Hoy');
    expect(etiquetaDia('2026-10-26', HOY)).toBe('Mañana');
    expect(etiquetaDia('2026-10-27', HOY)).toBe('Mar 27 oct');
    expect(etiquetaDia('2026-11-01', HOY)).toBe('Dom 1 nov');
  });
});

describe('proximasSalidasPorFecha', () => {
  const planes = [
    plan('Guatapé', [
      fecha({ fecha: '2025-01-01', cupo_total: 10, cupo_disponible: 0 }), // pasada
      fecha({ fecha: '2026-11-07', cupo_total: 10, cupo_disponible: 10 }), // nadie ha pagado
      fecha({ fecha: '2026-10-25', cupo_total: 10, cupo_disponible: 6 }), // hoy
      fecha({ fecha: '2026-10-26', cupo_total: 10, cupo_disponible: 0 }), // llena: sigue siendo una salida
    ]),
    plan('Jardín', [
      fecha({ fecha: '2026-10-30', cupo_total: 20, cupo_disponible: 5 }),
      fecha({ fecha: '2026-11-02', cupo_total: 10, cupo_disponible: 2 }), // casi llena
    ]),
    { ...plan('Borrador', [fecha({ fecha: '2026-10-28' })]), estado: 'borrador' as const },
    { ...plan('Despublicado', [fecha({ fecha: '2026-10-29' })]), estado: 'borrador' as const },
  ];
  const ventas = [
    venta({ booking_id: 'a', plan_titulo: 'Guatapé', fecha: '2026-10-25', pax: 2 }),
    venta({ booking_id: 'b', plan_titulo: 'Guatapé', fecha: '2026-10-25', pax: 3, booking_estado: 'completada' }),
    venta({ booking_id: 'c', plan_titulo: 'Guatapé', fecha: '2026-10-25', pax: 9, booking_estado: 'pendiente_pago' }),
    venta({ booking_id: 'd', plan_titulo: 'Guatapé', fecha: '2026-10-25', pax: 9, booking_estado: 'cancelada' }),
    venta({ booking_id: 'e', plan_titulo: 'Guatapé', fecha: '2026-10-26', pax: 10 }),
    venta({ booking_id: 'f', plan_titulo: 'Jardín', fecha: '2026-10-30', pax: 4 }),
    venta({ booking_id: 'g', plan_titulo: 'Jardín', fecha: '2026-11-02', pax: 8 }),
    venta({ booking_id: 'h', plan_titulo: 'Despublicado', fecha: '2026-10-29', pax: 3 }), // ya pagaron: se ve
    venta({ booking_id: 'i', plan_titulo: 'Jardín', fecha: '2026-10-20', pax: 5 }), // pasada
  ];

  it('va en orden de fecha, sin pasadas ni borradores sin ventas, con llenas incluidas', () => {
    const r = proximasSalidasPorFecha(planes, ventas, HOY);
    expect(r.map((s) => `${s.fecha} ${s.titulo}`)).toEqual([
      '2026-10-25 Guatapé',
      '2026-10-26 Guatapé',
      '2026-10-29 Despublicado',
      '2026-10-30 Jardín',
      '2026-11-02 Jardín',
      '2026-11-07 Guatapé',
    ]);
  });

  it('personas = pax de reservas pagadas de esa fecha y plan; libres = cupo disponible', () => {
    const r = proximasSalidasPorFecha(planes, ventas, HOY);
    const por = (f: string, t: string) => r.find((s) => s.fecha === f && s.titulo === t)!;
    expect(por('2026-10-25', 'Guatapé')).toMatchObject({ personas: 5, libres: 6 }); // sin pendientes ni canceladas
    expect(por('2026-10-30', 'Jardín')).toMatchObject({ personas: 4, libres: 5 });
    expect(por('2026-11-07', 'Guatapé')).toMatchObject({ personas: 0, libres: 10 });
  });

  it('nivel: llena, casi llena (≤ 20 % libre), vacía (nadie ha pagado) o normal', () => {
    const r = proximasSalidasPorFecha(planes, ventas, HOY);
    const nivel = (f: string, t: string) => r.find((s) => s.fecha === f && s.titulo === t)!.nivel;
    expect(nivel('2026-10-26', 'Guatapé')).toBe('llena');
    expect(nivel('2026-11-02', 'Jardín')).toBe('casi_llena');
    expect(nivel('2026-11-07', 'Guatapé')).toBe('vacia');
    expect(nivel('2026-10-25', 'Guatapé')).toBe('normal');
    expect(nivel('2026-10-30', 'Jardín')).toBe('normal'); // 25 % libre
  });

  it('sin planes no hay salidas', () => {
    expect(proximasSalidasPorFecha([], [], HOY)).toEqual([]);
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

  it('RNT por vencer con los días restantes', () => {
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
      texto: 'Tu RNT vence el 14 de noviembre de 2026 (en 20 días). Renuévalo a tiempo para no dejar de vender.',
    });
  });

  it('RNT vencido o sin vigencia: error que explica que no se muestran los planes', () => {
    const v = avisosResumen({ agencia: agencia({ rnt_vigente_hasta: '2026-10-20' }), planes, hayCuenta: true, hoy: HOY });
    expect(v[0]).toMatchObject({ clave: 'rnt', tono: 'error' });
    expect(v[0].texto).toContain('tus planes no se muestran');
    expect(v[0].texto).toContain('Renueva el registro y envíanos el soporte');
    const s = avisosResumen({ agencia: agencia({ rnt_vigente_hasta: null }), planes, hayCuenta: true, hoy: HOY });
    expect(s[0]).toMatchObject({ clave: 'rnt', tono: 'error' });
  });

  it('verificación pendiente: invita a preparar planes; rechazada: dice el motivo', () => {
    const p = avisosResumen({ agencia: agencia({ estado_verificacion: 'pendiente' }), planes: [], hayCuenta: false, hoy: HOY });
    expect(claves(p)).toEqual(['verificacion']); // sin otros avisos mientras no esté verificada
    expect(p[0].accion).toEqual({ texto: 'Crear un plan', ruta: '/planes/nuevo' });
    const r = avisosResumen({
      agencia: agencia({ estado_verificacion: 'rechazado', motivo_rechazo: 'RNT ilegible' }),
      planes,
      hayCuenta: true,
      hoy: HOY,
    });
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ clave: 'verificacion', tono: 'error' });
    expect(r[0].texto).toContain('RNT ilegible');
    expect(r[0].texto).toContain('Corrige tus datos y escríbenos');
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

  it('sin cuenta para pagos: lleva a registrarla; si no se pudo saber (null) no avisa', () => {
    const a = avisosResumen({ agencia: agencia(), planes, hayCuenta: false, hoy: HOY });
    expect(a[0]).toMatchObject({
      clave: 'cuenta',
      accion: { texto: 'Registrar cuenta', ruta: '/cuenta-dispersiones' },
    });
    expect(avisosResumen({ agencia: agencia(), planes, hayCuenta: null, hoy: HOY })).toEqual([]);
  });

  it('con RNT vencido no pide fechas (ya no se muestra nada) pero sí la cuenta; orden de urgencia', () => {
    const a = avisosResumen({
      agencia: agencia({ rnt_vigente_hasta: '2026-10-20' }),
      planes: [],
      hayCuenta: false,
      hoy: HOY,
    });
    expect(claves(a)).toEqual(['rnt', 'cuenta']);
  });
});
