import { Booking } from '@/core/models/booking';
import { BookingStatus } from '@/core/models/enums';
import { PlanDate } from '@/core/models/plan';
import { fechaLocal, fechaUtc } from '@/core/utils/fechas';

/**
 * «Próxima» y «Reseñable» dependen de la salida congelada de la reserva (`bookings.salida_at`),
 * no de la fecha del plan ni de un margen de un día. El reloj se inyecta: nada depende de la hora real.
 */
const ahora = fechaUtc(2026, 10, 25, 15, 0);
const MIN = 60_000;
const DIA = 24 * 60 * MIN;
const mas = (d: Date, ms: number) => new Date(d.getTime() + ms);

function reserva({
  salida = null,
  estado = BookingStatus.confirmada,
  conResena = false,
  fechaPlan = null,
}: {
  salida?: Date | null;
  estado?: BookingStatus;
  conResena?: boolean;
  fechaPlan?: Date | null;
} = {}): Booking {
  const b = new Booking({
    id: 'b-1',
    codigo: 'DIV-TEST01',
    planDateId: 'pd-1',
    viajeroId: 'v-1',
    pax: 2,
    montoTotal: 100000,
    estado,
    createdAt: mas(ahora, -30 * DIA),
    salidaAt: salida,
    planDate:
      fechaPlan === null
        ? null
        : new PlanDate({ id: 'pd-1', planId: 'p-1', fecha: fechaPlan, cupoTotal: 10, cupoDisponible: 5 }),
  });
  return conResena ? b.conResena() : b;
}

describe('esFutura', () => {
  test('salida 1 minuto después de ahora → futura', () => {
    expect(reserva({ salida: mas(ahora, MIN) }).esFutura(ahora)).toBe(true);
  });

  test('salida 1 minuto antes de ahora → ya salió', () => {
    expect(reserva({ salida: mas(ahora, -MIN) }).esFutura(ahora)).toBe(false);
  });

  test('salida exactamente ahora → ya salió', () => {
    expect(reserva({ salida: ahora }).esFutura(ahora)).toBe(false);
  });

  test('mañana → futura (sin margen de un día)', () => {
    expect(reserva({ salida: mas(ahora, DIA) }).esFutura(ahora)).toBe(true);
  });

  test('sin salida congelada usa la fecha del plan', () => {
    expect(
      reserva({ fechaPlan: fechaLocal(2026, 10, 26) }).esFutura(fechaLocal(2026, 10, 25, 23)),
    ).toBe(true);
    expect(
      reserva({ fechaPlan: fechaLocal(2026, 10, 24) }).esFutura(fechaLocal(2026, 10, 25, 23)),
    ).toBe(false);
  });

  test('sin salida ni fecha de plan no es futura', () => {
    expect(reserva().esFutura(ahora)).toBe(false);
  });
});

describe('vigente', () => {
  const sale = mas(ahora, MIN);

  test('confirmada que sale en 1 minuto → vigente', () => {
    expect(reserva({ salida: sale }).vigente(ahora)).toBe(true);
  });

  test('pendiente de pago que sale en 1 minuto → vigente', () => {
    expect(reserva({ salida: sale, estado: BookingStatus.pendientePago }).vigente(ahora)).toBe(true);
  });

  test('salida exactamente ahora → ya no es vigente', () => {
    expect(reserva({ salida: ahora }).vigente(ahora)).toBe(false);
  });

  test('salió hace 1 minuto → no vigente', () => {
    expect(reserva({ salida: mas(ahora, -MIN) }).vigente(ahora)).toBe(false);
  });

  test('cancelada o completada, aunque la salida sea futura → no vigente', () => {
    expect(reserva({ salida: sale, estado: BookingStatus.cancelada }).vigente(ahora)).toBe(false);
    expect(reserva({ salida: sale, estado: BookingStatus.completada }).vigente(ahora)).toBe(false);
  });

  test('sin salida conocida → no vigente', () => {
    expect(reserva().vigente(ahora)).toBe(false);
  });
});

describe('puedeResenar', () => {
  const salio = mas(ahora, -MIN);

  test('confirmada que salió hace 1 minuto y sin reseña → sí', () => {
    expect(reserva({ salida: salio }).puedeResenar(ahora)).toBe(true);
  });

  test('completada que ya salió → sí', () => {
    expect(reserva({ salida: salio, estado: BookingStatus.completada }).puedeResenar(ahora)).toBe(true);
  });

  test('sale en 1 minuto → no', () => {
    expect(reserva({ salida: mas(ahora, MIN) }).puedeResenar(ahora)).toBe(false);
  });

  test('sale mañana → no (el servidor la rechazaría)', () => {
    expect(reserva({ salida: mas(ahora, DIA) }).puedeResenar(ahora)).toBe(false);
  });

  test('ya reseñada → no', () => {
    expect(reserva({ salida: salio, conResena: true }).puedeResenar(ahora)).toBe(false);
  });

  test('pendiente de pago o cancelada → no', () => {
    expect(reserva({ salida: salio, estado: BookingStatus.pendientePago }).puedeResenar(ahora)).toBe(false);
    expect(reserva({ salida: salio, estado: BookingStatus.cancelada }).puedeResenar(ahora)).toBe(false);
  });

  test('sin ninguna fecha conocida → no', () => {
    expect(reserva().puedeResenar(ahora)).toBe(false);
  });
});

describe('Booking.fromMap', () => {
  const mapa = (salida?: string) => ({
    id: 'b-1',
    codigo: 'DIV-TEST01',
    plan_date_id: 'pd-1',
    viajero_id: 'v-1',
    pax: 2,
    monto_total: 100000,
    estado: 'confirmada',
    created_at: '2026-09-01T10:00:00+00:00',
    ...(salida === undefined ? {} : { salida_at: salida }),
  });

  test('lee la salida congelada con su zona horaria', () => {
    const b = Booking.fromMap(mapa('2026-10-27T13:00:00+00:00'));
    expect(b.salidaAt).toEqual(fechaUtc(2026, 10, 27, 13));
    expect(b.esFutura(ahora)).toBe(true);
  });

  test('sin salida_at queda en null y conResena la conserva', () => {
    expect(Booking.fromMap(mapa()).salidaAt).toBeNull();
    const b = Booking.fromMap(mapa('2026-10-27T13:00:00+00:00')).conResena();
    expect(b.salidaAt).toEqual(fechaUtc(2026, 10, 27, 13));
    expect(b.tieneResena).toBe(true);
  });
});

describe('derivados de la reserva (extra del port)', () => {
  test('venceAt = createdAt + 30 minutos (Booking.retencionMs)', () => {
    const b = reserva();
    expect(Booking.retencionMs).toBe(30 * MIN);
    expect(b.venceAt.getTime() - b.createdAt.getTime()).toBe(30 * MIN);
  });

  test('conResena devuelve una copia y no muta la original', () => {
    const b = reserva({ salida: ahora });
    const c = b.conResena();
    expect(c).not.toBe(b);
    expect(b.tieneResena).toBe(false);
    expect(c).toBeInstanceOf(Booking);
    expect(c.salida).toEqual(ahora);
  });
});
