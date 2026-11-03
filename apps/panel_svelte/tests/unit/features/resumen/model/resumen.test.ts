import { describe, expect, it } from 'vitest';
import {
  avisosResumen,
  calificacionPlanes,
  desdeResumen,
  diaLargo,
  estadoCabecera,
  fechaConAnio,
  kpisResumen,
  proximoPago,
  proximasSalidasPorFecha,
  relativoDia,
  repartoMes,
  resumenDelMes,
  resumenMesAnterior,
  salidasPorDia,
  sparkline,
} from '$lib/features/resumen/model/resumen';
import { cop } from '$lib/shared/lib/format';
import { agencia, fecha, HOY, liquidacion, plan, venta } from '$tests/fixtures';

describe('fechas en español', () => {
  it('diaLargo: día de la semana con mayúscula, día y mes (largo o corto)', () => {
    expect(diaLargo('2026-11-05')).toBe('Jueves 5 de noviembre');
    expect(diaLargo('2026-11-09', 'corto')).toBe('Lunes 9 de nov');
    expect(diaLargo('2026-10-25')).toBe('Domingo 25 de octubre');
  });

  it('fechaConAnio: «31 mar 2027»', () => {
    expect(fechaConAnio('2027-03-31')).toBe('31 mar 2027');
  });

  it('relativoDia: hoy, mañana o «en N días»', () => {
    expect(relativoDia('2026-10-25', HOY)).toBe('hoy');
    expect(relativoDia('2026-10-26', HOY)).toBe('mañana');
    expect(relativoDia('2026-10-28', HOY)).toBe('en 3 días');
    expect(relativoDia('2026-11-04', HOY)).toBe('en 10 días'); // cruza de mes
  });
});

/** Hoy antes de las 06:00 (hora de salida de los planes de prueba): las salidas de hoy aún no parten. */
const MADRUGADA = new Date(2026, 9, 25, 4, 0);

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
    const r = proximasSalidasPorFecha(planes, ventas, MADRUGADA);
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
    const r = proximasSalidasPorFecha(planes, ventas, MADRUGADA);
    const por = (f: string, t: string) => r.find((s) => s.fecha === f && s.titulo === t)!;
    expect(por('2026-10-25', 'Guatapé')).toMatchObject({ personas: 5, libres: 6 }); // sin pendientes ni canceladas
    expect(por('2026-10-30', 'Jardín')).toMatchObject({ personas: 4, libres: 5 });
    expect(por('2026-11-07', 'Guatapé')).toMatchObject({ personas: 0, libres: 10 });
  });

  it('nivel: llena, casi llena (≤ 20 % libre), vacía (nadie ha pagado) o normal', () => {
    const r = proximasSalidasPorFecha(planes, ventas, MADRUGADA);
    const nivel = (f: string, t: string) => r.find((s) => s.fecha === f && s.titulo === t)!.nivel;
    expect(nivel('2026-10-26', 'Guatapé')).toBe('llena');
    expect(nivel('2026-11-02', 'Jardín')).toBe('casi_llena');
    expect(nivel('2026-11-07', 'Guatapé')).toBe('vacia');
    expect(nivel('2026-10-25', 'Guatapé')).toBe('normal');
    expect(nivel('2026-10-30', 'Jardín')).toBe('normal'); // 25 % libre
  });

  it('sin planes no hay salidas', () => {
    expect(proximasSalidasPorFecha([], [], MADRUGADA)).toEqual([]);
  });
});

describe('proximasSalidasPorFecha · lo que ya salió hoy', () => {
  // 21:00 en Bogotá del lunes 2-nov (02:00 UTC del martes 3): un navegador adelantado ya ve el 3-nov.
  const ahora = new Date(Date.UTC(2026, 10, 3, 2, 0, 0));
  const con = (titulo: string, hora: string, dia: string) => ({
    ...plan(titulo, [fecha({ fecha: dia, cupo_total: 10, cupo_disponible: 10 })]),
    hora_salida: hora,
  });
  const planes = [
    con('Mañana temprano', '09:00:00', '2026-11-02'),
    con('Tarde', '10:00:00', '2026-11-02'),
    con('Noche', '22:00:00', '2026-11-02'),
    con('Día siguiente', '06:00:00', '2026-11-03'),
  ];

  it('una salida de hoy cuya hora en Bogotá ya pasó no es próxima; la de las 22:00 y las de mañana sí', () => {
    expect(proximasSalidasPorFecha(planes, [], ahora).map((s) => s.titulo)).toEqual(['Noche', 'Día siguiente']);
  });

  it('el resultado no depende de la zona horaria del navegador (solo cuenta el instante)', () => {
    // Mismo instante visto desde Bogotá y desde un reloj ya en el día siguiente: no hay otra fecha que consultar.
    const igual = new Date(ahora.getTime());
    expect(proximasSalidasPorFecha(planes, [], igual)).toEqual(proximasSalidasPorFecha(planes, [], ahora));
    expect(proximasSalidasPorFecha(planes, [], ahora).some((s) => s.fecha === '2026-11-02')).toBe(true);
  });

  it('si todas las de hoy ya salieron y no hay más, no queda ninguna y no hay personas por viajar', () => {
    const hoy = planes.slice(0, 2);
    const salidas = proximasSalidasPorFecha(hoy, [], ahora);
    expect(salidas).toEqual([]);
    expect(salidasPorDia(salidas, ahora)).toEqual([]);
    const k = kpisResumen({ planes: hoy, salidas, ventas: [], liquidaciones: [], hoy: ahora }).find((x) => x.clave === 'personas')!;
    expect(k).toMatchObject({ valor: '0', nota: 'No tienes salidas próximas', serie: null });
  });

  it('lo que ya salió tampoco cuenta como personas por viajar', () => {
    const ventas = [
      venta({ booking_id: 'a', plan_titulo: 'Mañana temprano', fecha: '2026-11-02', pax: 7 }),
      venta({ booking_id: 'b', plan_titulo: 'Noche', fecha: '2026-11-02', pax: 2 }),
    ];
    const salidas = proximasSalidasPorFecha(planes, ventas, ahora);
    const k = kpisResumen({ planes, salidas, ventas, liquidaciones: [], hoy: ahora }).find((x) => x.clave === 'personas')!;
    expect(k).toMatchObject({ valor: '2', nota: 'repartidas en 2 salidas' });
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

  it('si las salidas de hoy ya partieron y no hay otras, avisa que no hay salidas próximas', () => {
    const ahora = new Date(Date.UTC(2026, 10, 3, 2, 0, 0)); // lunes 21:00 en Bogotá
    const hoy = [plan('Guatapé', [fecha({ fecha: '2026-11-02' })])]; // sale 06:00
    const a = avisosResumen({ agencia: agencia(), planes: hoy, hayCuenta: true, hoy: ahora });
    expect(a[0]).toMatchObject({ clave: 'salidas', accion: { texto: 'Agregar fechas', ruta: '/planes' } });
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

describe('sparkline', () => {
  it('sin al menos dos puntos, o con todo en cero, no hay línea', () => {
    expect(sparkline([])).toBeNull();
    expect(sparkline([5])).toBeNull();
    expect(sparkline([0, 0, 0])).toBeNull();
  });

  it('dibuja de izquierda a derecha: el mayor arriba, el menor abajo y el punto en el último valor', () => {
    const s = sparkline([0, 10, 5])!;
    expect(s.linea).toBe('M2 35 L40 5 L78 20');
    expect(s.area).toBe('M2 35 L40 5 L78 20 L78 40 L2 40Z');
    expect(s).toMatchObject({ x: 78, y: 20 });
  });

  it('una serie plana pero con datos se dibuja a media altura', () => {
    expect(sparkline([4, 4])!.linea).toBe('M2 20 L78 20');
  });
});

describe('salidasPorDia', () => {
  const planes = [
    plan('Guatapé', [
      fecha({ fecha: '2026-10-28', cupo_total: 24, cupo_disponible: 21 }),
      fecha({ fecha: '2026-10-25', cupo_total: 10, cupo_disponible: 0 }),
    ]),
    { ...plan('Jardín', [fecha({ fecha: '2026-10-28', cupo_total: 16, cupo_disponible: 16 })]), hora_salida: '07:30:00' },
  ];
  const ventas = [
    venta({ booking_id: 'a', plan_titulo: 'Guatapé', fecha: '2026-10-28', pax: 3 }),
    venta({ booking_id: 'b', plan_titulo: 'Guatapé', fecha: '2026-10-25', pax: 10 }),
  ];
  const grupos = salidasPorDia(proximasSalidasPorFecha(planes, ventas, MADRUGADA), MADRUGADA);

  it('agrupa por día con título largo y día relativo, en orden de fecha', () => {
    expect(grupos.map((g) => [g.fecha, g.dia, g.relativo])).toEqual([
      ['2026-10-25', 'Domingo 25 de octubre', 'hoy'],
      ['2026-10-28', 'Miércoles 28 de octubre', 'en 3 días'],
    ]);
  });

  it('dentro del día va por hora, con personas, cupos libres y ocupación', () => {
    const dia = grupos[1].salidas;
    expect(dia.map((s) => [s.hora, s.titulo])).toEqual([
      ['06:00', 'Guatapé'],
      ['07:30', 'Jardín'],
    ]);
    expect(dia[0]).toMatchObject({
      detalle: '3 personas · 21 cupos libres',
      ocupacion: '3 de 24',
      porcentaje: 12.5,
      nivel: 'normal',
    });
    expect(dia[1]).toMatchObject({ detalle: '0 personas · 16 cupos libres', ocupacion: '0 de 16', porcentaje: 0, nivel: 'vacia' });
  });

  it('llena al 100 %, singulares y plan sin cupo total', () => {
    expect(grupos[0].salidas[0]).toMatchObject({ ocupacion: '10 de 10', porcentaje: 100, nivel: 'llena' });
    expect(grupos[0].salidas[0].detalle).toBe('10 personas · 0 cupos libres');
    const uno = salidasPorDia(
      [{ fecha: '2026-10-26', hora: '06:00', titulo: 'X', personas: 1, libres: 1, total: 0, nivel: 'normal' }],
      MADRUGADA,
    );
    expect(uno[0].salidas[0]).toMatchObject({ detalle: '1 persona · 1 cupo libre', porcentaje: 0 });
    expect(uno[0].relativo).toBe('mañana');
  });

  it('sin salidas no hay grupos', () => {
    expect(salidasPorDia([], MADRUGADA)).toEqual([]);
  });
});

describe('resumenMesAnterior y repartoMes', () => {
  const ventas = [
    venta({ booking_id: 'a', fecha: '2026-09-10', monto_total: 200000 }),
    venta({ booking_id: 'b', fecha: '2026-09-30', monto_total: 50000, booking_estado: 'completada' }),
    venta({ booking_id: 'c', fecha: '2026-09-12', booking_estado: 'pendiente_pago' }),
    venta({ booking_id: 'd', fecha: '2026-10-02' }), // mes en curso
    venta({ booking_id: 'e', fecha: '2025-09-10' }), // otro año
  ];

  it('mes anterior: reservas pagadas y lo vendido, con su frase', () => {
    expect(resumenMesAnterior(ventas, HOY)).toEqual({
      mes: 'septiembre',
      reservas: 2,
      vendido: 250000,
      texto: `En septiembre: 2 reservas por ${cop(250000)}.`,
    });
  });

  it('una sola reserva va en singular; sin ninguna lo dice simple', () => {
    expect(resumenMesAnterior([ventas[0]], HOY).texto).toBe(`En septiembre: 1 reserva por ${cop(200000)}.`);
    expect(resumenMesAnterior([], HOY).texto).toBe('En septiembre no hubo reservas pagadas.');
  });

  it('en enero el mes anterior es diciembre del año anterior', () => {
    const r = resumenMesAnterior([venta({ booking_id: 'z', fecha: '2025-12-20' })], new Date(2026, 0, 10, 12));
    expect(r).toMatchObject({ mes: 'diciembre', reservas: 1 });
  });

  it('reparto: lo que recibe y la comisión suman 100; sin ventas no hay barra', () => {
    const m = { mes: 'octubre', vendido: 1845000, comision: 221400, aRecibir: 1623600, reservas: 4 };
    expect(repartoMes(m)).toEqual({ recibe: 88, comision: 12 });
    expect(repartoMes({ ...m, vendido: 0, comision: 0, aRecibir: 0, reservas: 0 })).toBeNull();
  });
});

describe('calificacionPlanes', () => {
  const con = (titulo: string, rating: number, resenas: number, estado: 'publicado' | 'borrador' = 'publicado') => ({
    ...plan(titulo, []),
    rating_promedio: rating,
    reviews_count: resenas,
    estado,
  });

  it('promedio ponderado por reseñas de los planes publicados, con el total y los planes que las tienen', () => {
    const r = calificacionPlanes([con('A', 5, 3), con('B', 4, 10), con('C', 1, 0), con('D', 1, 50, 'borrador')]);
    expect(r).toEqual({ promedio: (5 * 3 + 4 * 10) / 13, resenas: 13, planes: 2 });
  });

  it('sin reseñas no hay calificación', () => {
    expect(calificacionPlanes([con('A', 0, 0)])).toBeNull();
    expect(calificacionPlanes([])).toBeNull();
  });
});

describe('desdeResumen', () => {
  it('cubre el mes anterior y las últimas 8 semanas, lo que quede más atrás', () => {
    expect(desdeResumen(HOY)).toBe('2026-08-31'); // lunes de hace 7 semanas
    expect(desdeResumen(new Date(2026, 10, 30, 12))).toBe('2026-10-01'); // 30-nov: el mes anterior empieza antes
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

describe('kpisResumen', () => {
  const planes = [
    {
      ...plan('Guatapé', [
        fecha({ fecha: '2026-10-26', cupo_total: 10, cupo_disponible: 6 }),
        fecha({ fecha: '2026-10-28', cupo_total: 10, cupo_disponible: 5 }),
      ]),
      rating_promedio: 4.5,
      reviews_count: 4,
    },
    {
      ...plan('Jardín', [fecha({ fecha: '2026-11-02', cupo_total: 10, cupo_disponible: 8 })]),
      rating_promedio: 4,
      reviews_count: 6,
    },
  ];
  const ventas = [
    venta({ booking_id: 'a', plan_titulo: 'Guatapé', fecha: '2026-10-26', pax: 4, monto_total: 200000, comision: 24000, saldo_agencia: 176000 }),
    venta({ booking_id: 'b', plan_titulo: 'Guatapé', fecha: '2026-10-28', pax: 5, monto_total: 300000, comision: 36000, saldo_agencia: 264000 }),
    venta({ booking_id: 'c', plan_titulo: 'Jardín', fecha: '2026-11-02', pax: 2, monto_total: 100000, comision: 12000, saldo_agencia: 88000 }),
    venta({ booking_id: 'd', plan_titulo: 'Jardín', fecha: '2026-10-08', pax: 1, monto_total: 100000, comision: 12000, saldo_agencia: 88000 }),
    venta({ booking_id: 'e', plan_titulo: 'Jardín', fecha: '2026-10-21', pax: 1, monto_total: 60000, comision: 10000, saldo_agencia: 50000 }),
  ];
  const liqs = [
    liquidacion({ id: 'l1', periodo_inicio: '2026-10-05', monto_a_pagar: 100000, estado: 'pagada_prueba' }),
    liquidacion({ id: 'l2', periodo_inicio: '2026-10-12', monto_a_pagar: 150000 }),
    liquidacion({ id: 'l3', periodo_inicio: '2026-10-19', monto_a_pagar: 250000 }),
    liquidacion({ id: 'l4', periodo_inicio: '2026-10-19', tipo: 'anticipo', estado: 'pagada_prueba', monto_a_pagar: 999 }),
    liquidacion({ id: 'l5', periodo_inicio: '2026-09-28', estado: 'anulada', monto_a_pagar: 777 }),
  ];
  const kpis = (parcial: object = {}) =>
    kpisResumen({
      planes,
      salidas: proximasSalidasPorFecha(planes, ventas, HOY),
      ventas,
      liquidaciones: liqs,
      hoy: HOY,
      ...parcial,
    });
  const kpi = (clave: string, parcial: object = {}) => kpis(parcial).find((k) => k.clave === clave)!;

  it('son cuatro, en el orden de la pantalla', () => {
    expect(kpis().map((k) => k.clave)).toEqual(['corresponde', 'personas', 'pago', 'calificacion']);
  });

  it('«Te corresponde este mes»: lo del mes, sobre lo vendido, con la serie semanal de lo que corresponde', () => {
    const k = kpi('corresponde');
    expect(k).toMatchObject({
      titulo: 'Te corresponde este mes',
      valor: cop(578000), // 176.000 + 264.000 + 88.000 + 50.000 de los viajes de octubre
      nota: `de ${cop(660000)} vendidos en octubre`,
    });
    // Ocho semanas (lunes) desde el 31-ago hasta la actual: la del 5-oct trae 88.000 (8-oct), la del 19-oct 50.000 (21-oct).
    expect(k.serie).toEqual(sparkline([0, 0, 0, 0, 0, 88000, 0, 50000]));
  });

  it('«Te corresponde» sin ventas del mes: cero, dicho en simple, sin serie', () => {
    const k = kpi('corresponde', { ventas: [] });
    expect(k).toMatchObject({ valor: cop(0), nota: 'Sin ventas pagadas en octubre', serie: null });
  });

  it('«Personas por viajar»: suma de las salidas próximas y cuántas son, con la serie por día', () => {
    const k = kpi('personas');
    expect(k).toMatchObject({ titulo: 'Personas por viajar', valor: '11', nota: 'repartidas en 3 salidas' });
    expect(k.serie).toEqual(sparkline([4, 5, 2]));
  });

  it('«Personas por viajar» sin salidas o con una sola', () => {
    expect(kpi('personas', { salidas: [] })).toMatchObject({ valor: '0', nota: 'No tienes salidas próximas', serie: null });
    const una = proximasSalidasPorFecha([planes[0]], ventas.slice(1, 2), new Date(2026, 9, 27, 12));
    expect(kpi('personas', { salidas: una })).toMatchObject({ valor: '5', nota: 'en 1 salida', serie: null });
  });

  it('«Personas por viajar» con salidas pero sin reservas pagadas no dice que hay gente repartida', () => {
    const vacias = proximasSalidasPorFecha(planes, [], HOY);
    expect(kpi('personas', { salidas: vacias })).toMatchObject({ valor: '0', nota: 'Sin reservas pagadas en 3 salidas', serie: null });
    expect(kpi('personas', { salidas: vacias.slice(0, 1) }).nota).toBe('Sin reservas pagadas en 1 salida');
  });

  it('«Próximo pago»: monto y día del lunes, con la serie de las liquidaciones semanales pagables', () => {
    const k = kpi('pago');
    expect(k).toMatchObject({
      titulo: 'Próximo pago',
      valor: cop(400000),
      nota: 'Lunes 26 de oct · liquidación semanal',
    });
    expect(k.serie).toEqual(sparkline([100000, 150000, 250000]));
  });

  it('«Próximo pago» sin pendientes o sin poder consultarse', () => {
    expect(kpi('pago', { liquidaciones: [] })).toMatchObject({
      valor: cop(0),
      nota: 'No tienes pagos pendientes por ahora',
      serie: null,
    });
    expect(kpi('pago', { liquidaciones: null })).toMatchObject({ valor: '—', nota: 'No pudimos consultarlo ahora' });
  });

  it('«Calificación de tus planes»: promedio con coma, estrellas, reseñas y planes', () => {
    const k = kpi('calificacion');
    expect(k).toMatchObject({
      titulo: 'Calificación de tus planes',
      valor: '4,2', // (4,5·4 + 4·6) / 10 = 4,2
      nota: '10 reseñas en 2 planes',
      estrellas: 4,
      serie: null,
    });
  });

  it('«Calificación» sin reseñas: sin número ni estrellas; con una sola, en singular', () => {
    const sin = kpi('calificacion', { planes: [{ ...planes[0], reviews_count: 0 }] });
    expect(sin).toMatchObject({ valor: '—', nota: 'Aún no tienes reseñas', estrellas: null });
    const una = kpi('calificacion', { planes: [{ ...planes[0], rating_promedio: 5, reviews_count: 1 }] });
    expect(una).toMatchObject({ valor: '5,0', nota: '1 reseña en 1 plan', estrellas: 5 });
  });
});
