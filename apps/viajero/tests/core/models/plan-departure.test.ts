import { DiversoError } from '@/core/errors/diverso-error';
import { ExperienceCategory, PlanStatus } from '@/core/models/enums';
import { Plan, PlanDate } from '@/core/models/plan';
import { localDate, utcDate } from '@/core/utils/dates';

import { postgrestError } from '../../support/errors';

/**
 * Una fecha de plan solo se ofrece mientras su salida (fecha + `plans.hora_salida`, hora de Bogotá,
 * UTC-5 todo el año) esté por ocurrir. El reloj se inyecta: nada depende de la hora real.
 *
 * «Ahora» de los tests = lunes 2 de noviembre de 2026, 15:30 en Bogotá (20:30 UTC).
 */
const now = utcDate(2026, 11, 2, 20, 30);
const today = localDate(2026, 11, 2);
/** `Duration(hours: h, minutes: m)` → minutos desde la medianoche. */
const hm = (h: number, m = 0) => h * 60 + m;

const planDate = (day: Date, { spots = 5, id = 'pd' }: { spots?: number; id?: string } = {}) =>
  new PlanDate({ id, planId: 'p', date: day, totalSpots: 10, availableSpots: spots });

const plan = (horaSalidaMinutos: number, dates: PlanDate[]) =>
  new Plan({
    id: 'p',
    agencyId: 'a',
    title: 'Plan',
    destination: 'Jericó',
    category: ExperienceCategory.culture,
    priceCop: 100000,
    status: PlanStatus.published,
    departureMinutes: horaSalidaMinutos,
    dates: dates,
  });

describe('fechasDisponiblesA: salidas que ya partieron', () => {
  test('salida hace 1 minuto (15:29 Bogotá) → oculta', () => {
    expect(plan(hm(15, 29), [planDate(today)]).availableDatesAt(now)).toHaveLength(0);
  });

  test('salida dentro de 1 minuto (15:31 Bogotá) → visible', () => {
    expect(plan(hm(15, 31), [planDate(today)]).availableDatesAt(now)).toHaveLength(1);
  });

  test('salida exactamente ahora (15:30 Bogotá) → oculta', () => {
    expect(plan(hm(15, 30), [planDate(today)]).availableDatesAt(now)).toHaveLength(0);
  });

  test(
    'la hora de salida es de Bogotá, no UTC: a las 21:00 Bogotá (02:00 UTC del día siguiente) ' +
      'una salida de hoy a las 22:00 sigue visible',
    () => {
      const bogotaNight = utcDate(2026, 11, 3, 2, 0);
      const p = plan(hm(22), [planDate(today)]);
      expect(p.availableDatesAt(bogotaNight)).toHaveLength(1);
      expect(p.availableDatesAt(utcDate(2026, 11, 3, 3, 1))).toHaveLength(0);
    },
  );

  test('mañana a la misma hora → visible; ayer → oculta', () => {
    const p = plan(hm(6), [
      planDate(localDate(2026, 11, 1), { id: 'ayer' }),
      planDate(localDate(2026, 11, 3), { id: 'manana' }),
    ]);
    expect(p.availableDatesAt(now).map((d) => d.id)).toEqual(['manana']);
  });

  test('mantiene el orden por fecha y sigue ocultando las fechas sin cupos', () => {
    const p = plan(hm(6), [
      planDate(localDate(2026, 11, 5), { id: 'tarde' }),
      planDate(localDate(2026, 11, 4), { id: 'agotada', spots: 0 }),
      planDate(localDate(2026, 11, 3), { id: 'pronto' }),
      planDate(today, { id: 'salio' }),
    ]);
    expect(p.availableDatesAt(now).map((d) => d.id)).toEqual(['pronto', 'tarde']);
  });

  test('yaSalio: misma regla para una fecha concreta (checkout)', () => {
    const p = plan(hm(6), [planDate(today)]);
    expect(p.hasDeparted(p.dates[0]!, now)).toBe(true);
    expect(p.hasDeparted(planDate(localDate(2026, 11, 3)), now)).toBe(false);
  });

  test('fechasDisponibles (reloj real) oculta una salida de hace 1 minuto y muestra una de dentro de 1', () => {
    // Campos UTC de este instante = reloj de pared de Bogotá.
    const bogota = new Date(Date.now() - 5 * 3600_000);
    const day = (t: Date) => localDate(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
    const time = (t: Date) => hm(t.getUTCHours(), t.getUTCMinutes());
    const ago = new Date(bogota.getTime() - 60_000);
    const soon = new Date(bogota.getTime() + 5 * 60_000);
    expect(plan(time(ago), [planDate(day(ago))]).availableDates).toHaveLength(0);
    expect(plan(time(soon), [planDate(day(soon))]).availableDates).toHaveLength(1);
  });
});

describe('Plan.fromMap con filas como las devuelve PostgREST', () => {
  const planRow = (time: string, dates: string[]) =>
    Plan.fromMap({
      id: 'p',
      agency_id: 'a',
      titulo: 'T',
      destino: 'D',
      precio_cop: 1000,
      hora_salida: time,
      plan_dates: dates.map((f) => ({
        id: f,
        plan_id: 'p',
        fecha: f,
        cupo_total: 5,
        cupo_disponible: 5,
      })),
    });

  test('22:00 del 2026-11-02 en Bogotá es 03:00 UTC del 2026-11-03', () => {
    const p = planRow('22:00:00', ['2026-11-02']);
    expect(p.departureOf(p.dates[0]!)).toEqual(utcDate(2026, 11, 3, 3));
  });

  test('el «ahora» puede venir en UTC o en hora local: mismo resultado en el límite (15:30 Bogotá)', () => {
    const p = planRow('15:30:00', ['2026-11-02']);
    const local = (d: Date) =>
      localDate(d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes());
    expect(p.availableDatesAt(local(utcDate(2026, 11, 2, 20, 29)))).toHaveLength(1);
    expect(p.availableDatesAt(local(utcDate(2026, 11, 2, 20, 30)))).toHaveLength(0);
  });

  test('salida a las 00:00 de Bogotá (05:00 UTC): visible a las 23:59 del día anterior, oculta a las 00:00', () => {
    const p = planRow('00:00:00', ['2026-11-03']);
    expect(p.availableDatesAt(utcDate(2026, 11, 3, 4, 59))).toHaveLength(1);
    expect(p.availableDatesAt(utcDate(2026, 11, 3, 5))).toHaveLength(0);
  });
});

describe('tieneSalidaEl (filtro de fecha del catálogo)', () => {
  test('solo cuenta si ese día aún hay una salida por partir', () => {
    const departed = plan(hm(6), [planDate(today)]);
    const upcoming = plan(hm(18), [planDate(today)]);
    expect(departed.hasDepartureOn(today, now)).toBe(false);
    expect(upcoming.hasDepartureOn(today, now)).toBe(true);
    expect(upcoming.hasDepartureOn(localDate(2026, 11, 3), now)).toBe(false);
  });
});

describe('Plan.fromMap: hora_salida', () => {
  const NO_TIME = Symbol('sin hora');
  const row = (time: string | null | typeof NO_TIME = NO_TIME) => ({
    id: 'p',
    agency_id: 'a',
    titulo: 'Plan',
    destino: 'Jericó',
    precio_cop: 100000,
    ...(time === NO_TIME ? {} : { hora_salida: time }),
  });

  test('lee el time de Postgres (HH:MM:SS)', () => {
    expect(Plan.fromMap(row('06:00:00')).departureMinutes).toBe(hm(6));
    expect(Plan.fromMap(row('15:45:00')).departureMinutes).toBe(hm(15, 45));
  });

  test('acepta HH:MM y, si falta, usa el 06:00 por defecto de la columna', () => {
    expect(Plan.fromMap(row('07:30')).departureMinutes).toBe(hm(7, 30));
    expect(Plan.fromMap(row(null)).departureMinutes).toBe(hm(6));
    expect(Plan.fromMap(row()).departureMinutes).toBe(hm(6));
  });
});

describe('FECHA_YA_SALIO', () => {
  test('el RPC create_booking la reporta y la app la explica', () => {
    const e = DiversoError.fromPostgrest(postgrestError('FECHA_YA_SALIO', { code: 'P0001' }));
    expect(e.code).toBe('FECHA_YA_SALIO');
    expect(e.userMessage).toBe('Esta salida ya partió. Elige otra fecha.');
  });

  test('RESERVA_YA_SALIO (pagar o cancelar tras la salida) ya no dice solo «cancelar»', () => {
    const text = new DiversoError('RESERVA_YA_SALIO').userMessage;
    expect(text).toContain('ya salió');
    expect(text).toContain('pagar');
  });
});
