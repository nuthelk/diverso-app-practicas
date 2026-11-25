import { BookingRepository } from '@/core/data/repositories/booking-repository';
import type { BookingApi } from '@/core/data/services/booking-api';
import { DiversoError } from '@/core/errors/diverso-error';
import { Booking } from '@/core/models/booking';
import { BookingStatus } from '@/core/models/enums';
import type { Row } from '@/core/models/row';
import { LABEL_REFUND_STATUS, RefundStatus } from '@/core/models/refund';
import { localDate } from '@/core/utils/dates';

import { FakeEdgeFunctions } from '../../../support/fake-edge-functions';
import { capture, httpError, postgrestError } from '../../../support/errors';

/**
 * Api falsa: devuelve las filas que se le indiquen y registra qué se le pidió. No sabe nada de
 * Supabase; así se prueban las reglas del repositorio sin red.
 */
class FakeBookingApi implements BookingApi {
  uid: string | null = 'viajero-1';
  /** Lo que lanza cualquier consulta (null = responde normal). */
  failure: unknown = null;

  createRow: Row = {};
  bookings: Row[] = [];
  reviews: Row[] = [];
  bookingRow: Row | null = null;
  reviewRow: Row | null = null;
  pending: Row[] = [];
  previewRow: Row = {};

  readonly queries: string[] = [];
  createdAfter: Date | null = null;

  private query<T>(name: string, response: T): T {
    this.queries.push(name);
    if (this.failure !== null) throw this.failure;
    return response;
  }

  async currentUserId() {
    return this.uid;
  }
  async createBooking() {
    return this.query('createBooking', this.createRow);
  }
  async bookingsOf() {
    return this.query('bookingsOf', this.bookings);
  }
  async reviewsOf() {
    return this.query('reviewsOf', this.reviews);
  }
  async booking() {
    return this.query('booking', this.bookingRow);
  }
  async reviewOf() {
    return this.query('reviewOf', this.reviewRow);
  }
  async pendingOf(p: { travelerId: string; planDateId: string; createdAfter: Date }) {
    this.createdAfter = p.createdAfter;
    return this.query('pendingOf', this.pending);
  }
  async cancellationPreview() {
    return this.query('cancellationPreview', this.previewRow);
  }
}

const row = (id: string, status = 'confirmada'): Row => ({
  id,
  codigo: `DIV-${id}`,
  plan_date_id: 'pd-1',
  viajero_id: 'viajero-1',
  pax: 2,
  monto_total: 200000,
  estado: status,
  created_at: '2026-10-25T10:00:00+00:00',
});

const error = (action: () => Promise<unknown>) => capture<DiversoError>(action).then((e) => {
  expect(e).toBeInstanceOf(DiversoError);
  return e;
});

const repo = (api: FakeBookingApi, edge?: FakeEdgeFunctions) =>
  new BookingRepository({
    api,
    edgeFunctions:
      edge ??
      new FakeEdgeFunctions(() => {
        throw new Error('sin Edge Functions');
      }),
  });

describe('crearReserva', () => {
  test('convierte la fila de create_booking en CreatedBooking', async () => {
    const api = new FakeBookingApi();
    api.createRow = {
      booking_id: 'b-1',
      codigo: 'DIV-AB12',
      monto_total: 300000,
      plan_titulo: 'Guatapé',
      fecha: '2026-11-20',
    };
    const r = await repo(api).createBooking({ planDateId: 'pd-1', pax: 2 });
    expect(r.bookingId).toBe('b-1');
    expect(r.code).toBe('DIV-AB12');
    expect(r.totalAmount).toBe(300000);
    expect(r.planTitle).toBe('Guatapé');
    expect(r.date).toEqual(localDate(2026, 11, 20));
  });

  test('sin plan_titulo ni fecha: título vacío y fecha nula', async () => {
    const api = new FakeBookingApi();
    api.createRow = { booking_id: 'b', codigo: 'C', monto_total: 1 };
    const r = await repo(api).createBooking({ planDateId: 'pd-1', pax: 1 });
    expect(r.planTitle).toBe('');
    expect(r.date).toBeNull();
  });

  test('un error de PostgREST sale como DiversoError con su código', async () => {
    const api = new FakeBookingApi();
    api.failure = postgrestError('SIN_CUPO', { code: 'P0001' });
    const e = await error(() => repo(api).createBooking({ planDateId: 'pd-1', pax: 2 }));
    expect(e.code).toBe('SIN_CUPO');
    expect(e.userMessage).toContain('cupos');
  });

  test('RESERVA_PENDIENTE_EXISTENTE conserva el id de la reserva existente', async () => {
    const api = new FakeBookingApi();
    api.failure = postgrestError('RESERVA_PENDIENTE_EXISTENTE', { code: 'P0001', details: 'b-9' });
    const e = await error(() => repo(api).createBooking({ planDateId: 'pd-1', pax: 2 }));
    expect(e.code).toBe('RESERVA_PENDIENTE_EXISTENTE');
    expect(e.details?.['booking_id']).toBe('b-9');
  });

  test('un fallo que no es de PostgREST sale como ERROR_INESPERADO', async () => {
    const api = new FakeBookingApi();
    api.failure = new Error('se cayó');
    const e = await error(() => repo(api).createBooking({ planDateId: 'pd-1', pax: 2 }));
    expect(e.code).toBe('ERROR_INESPERADO');
  });
});

describe('misReservas', () => {
  test('sin sesión: lista vacía y no consulta nada', async () => {
    const api = new FakeBookingApi();
    api.uid = null;
    expect(await repo(api).myBookings()).toEqual([]);
    expect(api.queries).toEqual([]);
  });

  test('sin reservas: no pide las reseñas', async () => {
    const api = new FakeBookingApi();
    expect(await repo(api).myBookings()).toEqual([]);
    expect(api.queries).toEqual(['bookingsOf']);
  });

  test('marca con reseña solo las reservas reseñadas y respeta el orden', async () => {
    const api = new FakeBookingApi();
    api.bookings = [row('b1'), row('b2'), row('b3')];
    api.reviews = [{ booking_id: 'b2' }];
    const r = await repo(api).myBookings();
    expect(r.map((b) => b.id)).toEqual(['b1', 'b2', 'b3']);
    expect(r.map((b) => b.hasReview)).toEqual([false, true, false]);
    expect(api.queries).toEqual(['bookingsOf', 'reviewsOf']);
  });
});

describe('reserva (por id)', () => {
  test('sin reseña: la devuelve tal cual', async () => {
    const api = new FakeBookingApi();
    api.bookingRow = row('b1');
    const b = await repo(api).booking('b1');
    expect(b.id).toBe('b1');
    expect(b.hasReview).toBe(false);
  });

  test('con reseña: la marca para no ofrecer «Reseñar» otra vez', async () => {
    const api = new FakeBookingApi();
    api.bookingRow = row('b1');
    api.reviewRow = { id: 'r1' };
    expect((await repo(api).booking('b1')).hasReview).toBe(true);
  });

  test('no existe: RESERVA_NO_EXISTE (no se convierte en ERROR_INESPERADO)', async () => {
    const api = new FakeBookingApi();
    const e = await error(() => repo(api).booking('nada'));
    expect(e.code).toBe('RESERVA_NO_EXISTE');
    expect(api.queries).toEqual(['booking']);
  });

  test('un error de PostgREST sale como DiversoError', async () => {
    const api = new FakeBookingApi();
    api.failure = postgrestError('NO_AUTENTICADO', { code: 'P0001' });
    const e = await error(() => repo(api).booking('b1'));
    expect(e.code).toBe('NO_AUTENTICADO');
  });
});

describe('reservaPendiente (ventana de 30 minutos)', () => {
  test('sin sesión: null y no consulta', async () => {
    const api = new FakeBookingApi();
    api.uid = null;
    expect(await repo(api).pendingBooking('pd-1')).toBeNull();
    expect(api.queries).toEqual([]);
  });

  test('pide solo las creadas en los últimos 30 minutos (Booking.retencionMs)', async () => {
    const api = new FakeBookingApi();
    const before = Date.now();
    await repo(api).pendingBooking('pd-1');
    const after = Date.now();
    const since = api.createdAfter!;
    // En JS un Date ya es un instante: la api lo envía con toISOString() (UTC, «Z»).
    expect(since).toBeInstanceOf(Date);
    expect(Booking.holdMs).toBe(30 * 60 * 1000);
    expect(since.getTime() < before - Booking.holdMs).toBe(false);
    expect(since.getTime() > after - Booking.holdMs).toBe(false);
  });

  test('sin filas: null; con filas: la primera', async () => {
    const api = new FakeBookingApi();
    expect(await repo(api).pendingBooking('pd-1')).toBeNull();
    api.pending = [row('b1', 'pendiente_pago'), row('b0')];
    const b = await repo(api).pendingBooking('pd-1');
    expect(b!.id).toBe('b1');
    expect(b!.status).toBe(BookingStatus.pendingPayment);
  });

  test('un error de PostgREST sale como DiversoError', async () => {
    const api = new FakeBookingApi();
    api.failure = postgrestError('algo raro');
    const e = await error(() => repo(api).pendingBooking('pd-1'));
    expect(e.code).toBe('ERROR_BD');
  });
});

describe('vistaPreviaCancelacion', () => {
  test('lee la fila del RPC', async () => {
    const api = new FakeBookingApi();
    api.previewRow = {
      booking_id: 'b',
      horas_antes: 30.5,
      aplica: true,
      porcentaje: 50,
      monto: 150000.0,
      motivo: 'x',
    };
    const v = await repo(api).cancellationPreview('b');
    expect(v.percentage).toBe(50);
    expect(v.amount).toBe(150000);
  });

  test('un error de PostgREST sale como DiversoError', async () => {
    const api = new FakeBookingApi();
    api.failure = postgrestError('NO_ES_DUENO', { code: 'P0001' });
    const e = await error(() => repo(api).cancellationPreview('b'));
    expect(e.code).toBe('NO_ES_DUENO');
  });
});

describe('cancelar (reservas-cancelar)', () => {
  const cancelled = (r: Row) => ({ estado: 'cancelada', reembolso: r });

  test('llama a reservas-cancelar y lee el reembolso aprobado', async () => {
    const edge = new FakeEdgeFunctions(() =>
      cancelled({
        aplica: true,
        porcentaje: 50,
        monto: 150000,
        estado: 'aprobado',
        motivo: 'Cancelación con menos de 48 h y al menos 24 h de anticipación: reembolso del 50 %',
      }),
    );
    const r = await repo(new FakeBookingApi(), edge).cancel('b-1');
    expect(edge.calls).toHaveLength(1);
    expect(edge.calls[0]![0]).toBe('reservas-cancelar');
    expect(edge.calls[0]![1]).toStrictEqual({ booking_id: 'b-1' });
    expect(r.applies).toBe(true);
    expect(r.percentage).toBe(50);
    expect(r.amount).toBe(150000);
    expect(r.status).toBe(RefundStatus.approved);
    expect(LABEL_REFUND_STATUS[r.status]).toBe('Reembolso de prueba aprobado');
  });

  test('estados pendiente, rechazado y no_aplica', async () => {
    const cases: [string, RefundStatus, string][] = [
      ['pendiente', RefundStatus.pending, 'Reembolso de prueba pendiente'],
      ['rechazado', RefundStatus.rejected, 'Reembolso de prueba rechazado'],
      ['no_aplica', RefundStatus.notApplicable, 'Sin reembolso'],
    ];
    for (const [raw, expected, label] of cases) {
      const edge = new FakeEdgeFunctions(() =>
        cancelled({
          aplica: raw !== 'no_aplica',
          porcentaje: raw === 'no_aplica' ? 0 : 100,
          monto: raw === 'no_aplica' ? 0 : 300000,
          estado: raw,
          motivo: 'm',
        }),
      );
      const r = await repo(new FakeBookingApi(), edge).cancel('b-1');
      expect(r.status).toBe(expected);
      expect(LABEL_REFUND_STATUS[r.status]).toBe(label);
    }
  });

  test('errores de la función: ESTADO_INVALIDO', async () => {
    const edge = new FakeEdgeFunctions(() => httpError(409, { error: 'ESTADO_INVALIDO' }));
    const e = await error(() => repo(new FakeBookingApi(), edge).cancel('b-1'));
    expect(e.code).toBe('ESTADO_INVALIDO');
  });
});
