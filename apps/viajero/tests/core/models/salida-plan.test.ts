import { DiversoError } from '@/core/errors/diverso-error';
import { ExperienceCategory, PlanStatus } from '@/core/models/enums';
import { Plan, PlanDate } from '@/core/models/plan';
import { fechaLocal, fechaUtc } from '@/core/utils/fechas';

import { errorPostgrest } from '../../support/errores';

/**
 * Una fecha de plan solo se ofrece mientras su salida (fecha + `plans.hora_salida`, hora de Bogotá,
 * UTC-5 todo el año) esté por ocurrir. El reloj se inyecta: nada depende de la hora real.
 *
 * «Ahora» de los tests = lunes 2 de noviembre de 2026, 15:30 en Bogotá (20:30 UTC).
 */
const ahora = fechaUtc(2026, 11, 2, 20, 30);
const hoy = fechaLocal(2026, 11, 2);
/** `Duration(hours: h, minutes: m)` → minutos desde la medianoche. */
const hm = (h: number, m = 0) => h * 60 + m;

const fecha = (dia: Date, { cupos = 5, id = 'pd' }: { cupos?: number; id?: string } = {}) =>
  new PlanDate({ id, planId: 'p', fecha: dia, cupoTotal: 10, cupoDisponible: cupos });

const plan = (horaSalidaMinutos: number, fechas: PlanDate[]) =>
  new Plan({
    id: 'p',
    agencyId: 'a',
    titulo: 'Plan',
    destino: 'Jericó',
    categoria: ExperienceCategory.cultura,
    precioCop: 100000,
    estado: PlanStatus.publicado,
    horaSalidaMinutos,
    dates: fechas,
  });

describe('fechasDisponiblesA: salidas que ya partieron', () => {
  test('salida hace 1 minuto (15:29 Bogotá) → oculta', () => {
    expect(plan(hm(15, 29), [fecha(hoy)]).fechasDisponiblesA(ahora)).toHaveLength(0);
  });

  test('salida dentro de 1 minuto (15:31 Bogotá) → visible', () => {
    expect(plan(hm(15, 31), [fecha(hoy)]).fechasDisponiblesA(ahora)).toHaveLength(1);
  });

  test('salida exactamente ahora (15:30 Bogotá) → oculta', () => {
    expect(plan(hm(15, 30), [fecha(hoy)]).fechasDisponiblesA(ahora)).toHaveLength(0);
  });

  test(
    'la hora de salida es de Bogotá, no UTC: a las 21:00 Bogotá (02:00 UTC del día siguiente) ' +
      'una salida de hoy a las 22:00 sigue visible',
    () => {
      const nocheBogota = fechaUtc(2026, 11, 3, 2, 0);
      const p = plan(hm(22), [fecha(hoy)]);
      expect(p.fechasDisponiblesA(nocheBogota)).toHaveLength(1);
      expect(p.fechasDisponiblesA(fechaUtc(2026, 11, 3, 3, 1))).toHaveLength(0);
    },
  );

  test('mañana a la misma hora → visible; ayer → oculta', () => {
    const p = plan(hm(6), [
      fecha(fechaLocal(2026, 11, 1), { id: 'ayer' }),
      fecha(fechaLocal(2026, 11, 3), { id: 'manana' }),
    ]);
    expect(p.fechasDisponiblesA(ahora).map((d) => d.id)).toEqual(['manana']);
  });

  test('mantiene el orden por fecha y sigue ocultando las fechas sin cupos', () => {
    const p = plan(hm(6), [
      fecha(fechaLocal(2026, 11, 5), { id: 'tarde' }),
      fecha(fechaLocal(2026, 11, 4), { id: 'agotada', cupos: 0 }),
      fecha(fechaLocal(2026, 11, 3), { id: 'pronto' }),
      fecha(hoy, { id: 'salio' }),
    ]);
    expect(p.fechasDisponiblesA(ahora).map((d) => d.id)).toEqual(['pronto', 'tarde']);
  });

  test('yaSalio: misma regla para una fecha concreta (checkout)', () => {
    const p = plan(hm(6), [fecha(hoy)]);
    expect(p.yaSalio(p.dates[0]!, ahora)).toBe(true);
    expect(p.yaSalio(fecha(fechaLocal(2026, 11, 3)), ahora)).toBe(false);
  });

  test('fechasDisponibles (reloj real) oculta una salida de hace 1 minuto y muestra una de dentro de 1', () => {
    // Campos UTC de este instante = reloj de pared de Bogotá.
    const bogota = new Date(Date.now() - 5 * 3600_000);
    const dia = (t: Date) => fechaLocal(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
    const hora = (t: Date) => hm(t.getUTCHours(), t.getUTCMinutes());
    const hace = new Date(bogota.getTime() - 60_000);
    const dentro = new Date(bogota.getTime() + 5 * 60_000);
    expect(plan(hora(hace), [fecha(dia(hace))]).fechasDisponibles).toHaveLength(0);
    expect(plan(hora(dentro), [fecha(dia(dentro))]).fechasDisponibles).toHaveLength(1);
  });
});

describe('Plan.fromMap con filas como las devuelve PostgREST', () => {
  const planMapa = (hora: string, fechas: string[]) =>
    Plan.fromMap({
      id: 'p',
      agency_id: 'a',
      titulo: 'T',
      destino: 'D',
      precio_cop: 1000,
      hora_salida: hora,
      plan_dates: fechas.map((f) => ({
        id: f,
        plan_id: 'p',
        fecha: f,
        cupo_total: 5,
        cupo_disponible: 5,
      })),
    });

  test('22:00 del 2026-11-02 en Bogotá es 03:00 UTC del 2026-11-03', () => {
    const p = planMapa('22:00:00', ['2026-11-02']);
    expect(p.salidaDe(p.dates[0]!)).toEqual(fechaUtc(2026, 11, 3, 3));
  });

  test('el «ahora» puede venir en UTC o en hora local: mismo resultado en el límite (15:30 Bogotá)', () => {
    const p = planMapa('15:30:00', ['2026-11-02']);
    const local = (d: Date) =>
      fechaLocal(d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes());
    expect(p.fechasDisponiblesA(local(fechaUtc(2026, 11, 2, 20, 29)))).toHaveLength(1);
    expect(p.fechasDisponiblesA(local(fechaUtc(2026, 11, 2, 20, 30)))).toHaveLength(0);
  });

  test('salida a las 00:00 de Bogotá (05:00 UTC): visible a las 23:59 del día anterior, oculta a las 00:00', () => {
    const p = planMapa('00:00:00', ['2026-11-03']);
    expect(p.fechasDisponiblesA(fechaUtc(2026, 11, 3, 4, 59))).toHaveLength(1);
    expect(p.fechasDisponiblesA(fechaUtc(2026, 11, 3, 5))).toHaveLength(0);
  });
});

describe('tieneSalidaEl (filtro de fecha del catálogo)', () => {
  test('solo cuenta si ese día aún hay una salida por partir', () => {
    const salio = plan(hm(6), [fecha(hoy)]);
    const porSalir = plan(hm(18), [fecha(hoy)]);
    expect(salio.tieneSalidaEl(hoy, ahora)).toBe(false);
    expect(porSalir.tieneSalidaEl(hoy, ahora)).toBe(true);
    expect(porSalir.tieneSalidaEl(fechaLocal(2026, 11, 3), ahora)).toBe(false);
  });
});

describe('Plan.fromMap: hora_salida', () => {
  const SIN_HORA = Symbol('sin hora');
  const mapa = (hora: string | null | typeof SIN_HORA = SIN_HORA) => ({
    id: 'p',
    agency_id: 'a',
    titulo: 'Plan',
    destino: 'Jericó',
    precio_cop: 100000,
    ...(hora === SIN_HORA ? {} : { hora_salida: hora }),
  });

  test('lee el time de Postgres (HH:MM:SS)', () => {
    expect(Plan.fromMap(mapa('06:00:00')).horaSalidaMinutos).toBe(hm(6));
    expect(Plan.fromMap(mapa('15:45:00')).horaSalidaMinutos).toBe(hm(15, 45));
  });

  test('acepta HH:MM y, si falta, usa el 06:00 por defecto de la columna', () => {
    expect(Plan.fromMap(mapa('07:30')).horaSalidaMinutos).toBe(hm(7, 30));
    expect(Plan.fromMap(mapa(null)).horaSalidaMinutos).toBe(hm(6));
    expect(Plan.fromMap(mapa()).horaSalidaMinutos).toBe(hm(6));
  });
});

describe('FECHA_YA_SALIO', () => {
  test('el RPC create_booking la reporta y la app la explica', () => {
    const e = DiversoError.fromPostgrest(errorPostgrest('FECHA_YA_SALIO', { code: 'P0001' }));
    expect(e.codigo).toBe('FECHA_YA_SALIO');
    expect(e.mensajeUsuario).toBe('Esta salida ya partió. Elige otra fecha.');
  });

  test('RESERVA_YA_SALIO (pagar o cancelar tras la salida) ya no dice solo «cancelar»', () => {
    const texto = new DiversoError('RESERVA_YA_SALIO').mensajeUsuario;
    expect(texto).toContain('ya salió');
    expect(texto).toContain('pagar');
  });
});
