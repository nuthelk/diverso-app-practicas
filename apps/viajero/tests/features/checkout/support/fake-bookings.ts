import {
  Booking,
  BookingStatus,
  CreatedBooking,
  DiversoError,
  RefundStatus,
  CancellationResult,
  type BookingRepository,
  type Plan,
  type Public,
} from '@/core';

import type { Compuerta } from '../../../support/compuerta';

/**
 * [BookingRepository] sin Supabase para los view models y vistas del checkout (port de
 * `reservas_falsas.dart`, solo lo que usa el checkout). Vive en la carpeta de la funcionalidad
 * para no pisar los dobles de reservas de T7.
 */
export class FakeBookings
  implements Pick<Public<BookingRepository>, 'booking' | 'pendingBooking' | 'createBooking' | 'cancel' | 'myBookings'>
{
  list: Booking[];

  /** Si no es null, `myBookings` y `booking` lo lanzan. */
  failure: unknown = null;

  /** Si no es null, `cancel` lo lanza. */
  cancelFailure: unknown = null;

  /** Si no es null, `myBookings` y `booking` esperan a que se complete (respuestas tardías). */
  gate: Compuerta | null = null;

  /** Reserva pendiente de pago que `pendingBooking` devuelve (null = no hay ninguna). */
  pending: Booking | null = null;

  /** Si no es null, `pendingBooking` lo lanza. */
  pendingLookupFailure: unknown = null;

  /**
   * Si no es null, `createBooking` lo lanza; antes deja `pendingAfterFailure` como la pendiente
   * (otra pestaña la creó entre la consulta y el alta).
   */
  createFailure: unknown = null;
  pendingAfterFailure: Booking | null = null;

  result = new CancellationResult({
    applies: false,
    percentage: 0,
    amount: 0,
    status: RefundStatus.notApplicable,
    reason: 'Reserva sin pago confirmado',
  });

  listQueries = 0;
  pendingLookups = 0;
  readonly bookingQueries: string[] = [];
  readonly cancelledIds: string[] = [];
  readonly createdBookings: { planDateId: string; pax: number }[] = [];

  constructor(list: Booking[] = []) {
    this.list = [...list];
  }

  async myBookings(): Promise<Booking[]> {
    this.listQueries++;
    await this.gate?.promesa;
    if (this.failure !== null) throw this.failure;
    return this.list;
  }

  async booking(bookingId: string): Promise<Booking> {
    this.bookingQueries.push(bookingId);
    await this.gate?.promesa;
    if (this.failure !== null) throw this.failure;
    const b = this.list.find((x) => x.id === bookingId);
    if (!b) throw new DiversoError('RESERVA_NO_EXISTE');
    return b;
  }

  async pendingBooking(_planDateId: string): Promise<Booking | null> {
    this.pendingLookups++;
    if (this.pendingLookupFailure !== null) throw this.pendingLookupFailure;
    return this.pending;
  }

  async createBooking({ planDateId, pax }: { planDateId: string; pax: number }): Promise<CreatedBooking> {
    if (this.createFailure !== null) {
      this.pending = this.pendingAfterFailure;
      throw this.createFailure;
    }
    this.createdBookings.push({ planDateId, pax });
    return new CreatedBooking({
      bookingId: `nueva-${this.createdBookings.length}`,
      code: 'DIV-NEW',
      totalAmount: 1,
      planTitle: '',
    });
  }

  async cancel(bookingId: string): Promise<CancellationResult> {
    if (this.cancelFailure !== null) throw this.cancelFailure;
    this.cancelledIds.push(bookingId);
    if (this.pending?.id === bookingId) this.pending = null;
    return this.result;
  }
}

/** Reserva de prueba confirmada (`reservaDePrueba` de Dart). */
export function testBooking({
  id = 'res-1',
  code = 'DIV-AAAA0001',
  status = BookingStatus.confirmed,
  plan = null,
}: { id?: string; code?: string; status?: BookingStatus; plan?: Plan | null } = {}): Booking {
  return new Booking({
    id,
    code,
    planDateId: 'pd',
    travelerId: 'v',
    pax: 2,
    totalAmount: 190000,
    status,
    createdAt: new Date(2026, 9, 1),
    departureAt: new Date(Date.now() + 3 * 24 * 3600 * 1000),
    plan,
  });
}

/** Reserva pendiente de pago de `fecha-1` creada hace [minutesAgo] minutos. */
export function testPendingBooking({ pax = 2, minutesAgo = 5 }: { pax?: number; minutesAgo?: number } = {}): Booking {
  return new Booking({
    id: 'pend-1',
    code: 'DIV-PEND01',
    planDateId: 'fecha-1',
    travelerId: 'v-1',
    pax,
    totalAmount: 150000 * pax,
    status: BookingStatus.pendingPayment,
    createdAt: new Date(Date.now() - minutesAgo * 60_000),
  });
}
