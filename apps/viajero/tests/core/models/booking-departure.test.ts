import { Booking } from '@/core/models/booking';
import { BookingStatus } from '@/core/models/enums';
import { PlanDate } from '@/core/models/plan';
import { fechaLocal, fechaUtc } from '@/core/utils/fechas';

/**
 * «Próxima» y «Reseñable» dependen de la salida congelada de la reserva (`bookings.salida_at`),
 * no de la fecha del plan ni de un margen de un día. El reloj se inyecta: nada depende de la hora real.
 */
const now = fechaUtc(2026, 10, 25, 15, 0);
const MIN = 60_000;
const DAY = 24 * 60 * MIN;
const plus = (d: Date, ms: number) => new Date(d.getTime() + ms);

function booking({
  departure = null,
  status = BookingStatus.confirmed,
  reviewed = false,
  planDate = null,
}: {
  departure?: Date | null;
  status?: BookingStatus;
  reviewed?: boolean;
  planDate?: Date | null;
} = {}): Booking {
  const b = new Booking({
    id: 'b-1',
    code: 'DIV-TEST01',
    planDateId: 'pd-1',
    travelerId: 'v-1',
    pax: 2,
    totalAmount: 100000,
    status,
    createdAt: plus(now, -30 * DAY),
    departureAt: departure,
    planDate:
      planDate === null
        ? null
        : new PlanDate({ id: 'pd-1', planId: 'p-1', date: planDate, totalSpots: 10, availableSpots: 5 }),
  });
  return reviewed ? b.withReview() : b;
}

describe('esFutura', () => {
  test('salida 1 minuto después de ahora → futura', () => {
    expect(booking({ departure: plus(now, MIN) }).isUpcoming(now)).toBe(true);
  });

  test('salida 1 minuto antes de ahora → ya salió', () => {
    expect(booking({ departure: plus(now, -MIN) }).isUpcoming(now)).toBe(false);
  });

  test('salida exactamente ahora → ya salió', () => {
    expect(booking({ departure: now }).isUpcoming(now)).toBe(false);
  });

  test('mañana → futura (sin margen de un día)', () => {
    expect(booking({ departure: plus(now, DAY) }).isUpcoming(now)).toBe(true);
  });

  test('sin salida congelada usa la fecha del plan', () => {
    expect(
      booking({ planDate: fechaLocal(2026, 10, 26) }).isUpcoming(fechaLocal(2026, 10, 25, 23)),
    ).toBe(true);
    expect(
      booking({ planDate: fechaLocal(2026, 10, 24) }).isUpcoming(fechaLocal(2026, 10, 25, 23)),
    ).toBe(false);
  });

  test('sin salida ni fecha de plan no es futura', () => {
    expect(booking().isUpcoming(now)).toBe(false);
  });
});

describe('vigente', () => {
  const departs = plus(now, MIN);

  test('confirmada que sale en 1 minuto → vigente', () => {
    expect(booking({ departure: departs }).isActive(now)).toBe(true);
  });

  test('pendiente de pago que sale en 1 minuto → vigente', () => {
    expect(booking({ departure: departs, status: BookingStatus.pendingPayment }).isActive(now)).toBe(true);
  });

  test('salida exactamente ahora → ya no es vigente', () => {
    expect(booking({ departure: now }).isActive(now)).toBe(false);
  });

  test('salió hace 1 minuto → no vigente', () => {
    expect(booking({ departure: plus(now, -MIN) }).isActive(now)).toBe(false);
  });

  test('cancelada o completada, aunque la salida sea futura → no vigente', () => {
    expect(booking({ departure: departs, status: BookingStatus.cancelled }).isActive(now)).toBe(false);
    expect(booking({ departure: departs, status: BookingStatus.completed }).isActive(now)).toBe(false);
  });

  test('sin salida conocida → no vigente', () => {
    expect(booking().isActive(now)).toBe(false);
  });
});

describe('puedeResenar', () => {
  const departed = plus(now, -MIN);

  test('confirmada que salió hace 1 minuto y sin reseña → sí', () => {
    expect(booking({ departure: departed }).canReview(now)).toBe(true);
  });

  test('completada que ya salió → sí', () => {
    expect(booking({ departure: departed, status: BookingStatus.completed }).canReview(now)).toBe(true);
  });

  test('sale en 1 minuto → no', () => {
    expect(booking({ departure: plus(now, MIN) }).canReview(now)).toBe(false);
  });

  test('sale mañana → no (el servidor la rechazaría)', () => {
    expect(booking({ departure: plus(now, DAY) }).canReview(now)).toBe(false);
  });

  test('ya reseñada → no', () => {
    expect(booking({ departure: departed, reviewed: true }).canReview(now)).toBe(false);
  });

  test('pendiente de pago o cancelada → no', () => {
    expect(booking({ departure: departed, status: BookingStatus.pendingPayment }).canReview(now)).toBe(false);
    expect(booking({ departure: departed, status: BookingStatus.cancelled }).canReview(now)).toBe(false);
  });

  test('sin ninguna fecha conocida → no', () => {
    expect(booking().canReview(now)).toBe(false);
  });
});

describe('Booking.fromMap', () => {
  const row = (departure?: string) => ({
    id: 'b-1',
    codigo: 'DIV-TEST01',
    plan_date_id: 'pd-1',
    viajero_id: 'v-1',
    pax: 2,
    monto_total: 100000,
    estado: 'confirmada',
    created_at: '2026-09-01T10:00:00+00:00',
    ...(departure === undefined ? {} : { salida_at: departure }),
  });

  test('lee la salida congelada con su zona horaria', () => {
    const b = Booking.fromMap(row('2026-10-27T13:00:00+00:00'));
    expect(b.departureAt).toEqual(fechaUtc(2026, 10, 27, 13));
    expect(b.isUpcoming(now)).toBe(true);
  });

  test('sin salida_at queda en null y conResena la conserva', () => {
    expect(Booking.fromMap(row()).departureAt).toBeNull();
    const b = Booking.fromMap(row('2026-10-27T13:00:00+00:00')).withReview();
    expect(b.departureAt).toEqual(fechaUtc(2026, 10, 27, 13));
    expect(b.hasReview).toBe(true);
  });
});

describe('derivados de la reserva (extra del port)', () => {
  test('venceAt = createdAt + 30 minutos (Booking.retencionMs)', () => {
    const b = booking();
    expect(Booking.holdMs).toBe(30 * MIN);
    expect(b.expiresAt.getTime() - b.createdAt.getTime()).toBe(30 * MIN);
  });

  test('conResena devuelve una copia y no muta la original', () => {
    const b = booking({ departure: now });
    const c = b.withReview();
    expect(c).not.toBe(b);
    expect(b.hasReview).toBe(false);
    expect(c).toBeInstanceOf(Booking);
    expect(c.departure).toEqual(now);
  });
});
