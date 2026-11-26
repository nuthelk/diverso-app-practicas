import {
  Booking,
  BookingStatus,
  CreatedBooking,
  DiversoError,
  RefundStatus,
  CancellationResult,
  CancellationPreview,
  type BookingRepository,
  type Plan,
  type Public,
  type Review,
  type ReviewRepository,
} from '@/core';

import type { Gate } from './gate';

/**
 * [BookingRepository] sin Supabase para pruebas de los view models y las vistas de reservas
 * (port de `test/support/reservas_falsas.dart`).
 */
export class FakeBookingRepository implements Public<BookingRepository> {
  list: Booking[];

  /** Si no es null, `myBookings` y `booking` lo lanzan. */
  failure: unknown = null;

  /** Si no es null, `cancellationPreview` y `cancel` lo lanzan. */
  cancelFailure: unknown = null;

  /** Si no es null, `myBookings` y `booking` esperan a que se complete (respuestas tardías). */
  gate: Gate | null = null;

  preview = new CancellationPreview({ applies: true, percentage: 100, amount: 190000, hoursBefore: 72, reason: '' });

  result = new CancellationResult({
    applies: true,
    percentage: 100,
    amount: 190000,
    status: RefundStatus.approved,
    reason: '',
  });

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

  listQueries = 0;
  readonly bookingQueries: string[] = [];
  readonly cancelledIds: string[] = [];
  readonly createdBookings: { planDateId: string; pax: number }[] = [];

  constructor(list: Booking[] = []) {
    this.list = [...list];
  }

  async myBookings(): Promise<Booking[]> {
    this.listQueries++;
    await this.gate?.promise;
    if (this.failure != null) throw this.failure;
    return this.list;
  }

  async booking(bookingId: string): Promise<Booking> {
    this.bookingQueries.push(bookingId);
    await this.gate?.promise;
    if (this.failure != null) throw this.failure;
    const b = this.list.find((r) => r.id === bookingId);
    if (!b) throw new DiversoError('RESERVA_NO_EXISTE');
    return b;
  }

  async pendingBooking(_planDateId: string): Promise<Booking | null> {
    if (this.pendingLookupFailure != null) throw this.pendingLookupFailure;
    return this.pending;
  }

  async createBooking({ planDateId, pax }: { planDateId: string; pax: number }): Promise<CreatedBooking> {
    if (this.createFailure != null) {
      this.pending = this.pendingAfterFailure;
      throw this.createFailure;
    }
    this.createdBookings.push({ planDateId, pax });
    return new CreatedBooking({ bookingId: `nueva-${this.createdBookings.length}`, code: 'DIV-NEW', totalAmount: 1, planTitle: '' });
  }

  async cancellationPreview(_bookingId: string): Promise<CancellationPreview> {
    if (this.cancelFailure != null) throw this.cancelFailure;
    return this.preview;
  }

  async cancel(bookingId: string): Promise<CancellationResult> {
    if (this.cancelFailure != null) throw this.cancelFailure;
    this.cancelledIds.push(bookingId);
    if (this.pending?.id === bookingId) this.pending = null;
    return this.result;
  }
}

/** [ReviewRepository] sin Supabase para el envío de reseñas. */
export class FakeReviewPublisher implements Public<ReviewRepository> {
  /** Si no es null, `create` lo lanza. */
  failure: unknown = null;

  /** Si no es null, `create` espera a que se complete. */
  gate: Gate | null = null;

  readonly createdReviews: { bookingId: string; rating: number; comment: string | null }[] = [];

  async byPlan(_planId: string): Promise<Review[]> {
    return [];
  }

  async create({
    bookingId,
    rating,
    comment = null,
  }: {
    bookingId: string;
    rating: number;
    comment?: string | null;
  }): Promise<void> {
    await this.gate?.promise;
    if (this.failure != null) throw this.failure;
    this.createdReviews.push({ bookingId, rating, comment });
  }
}

/** Reserva de prueba confirmada con salida en [departure] (por defecto, 3 días adelante). */
export function testBooking({
  id = 'res-1',
  code = 'DIV-AAAA0001',
  departure,
  status = BookingStatus.confirmed,
  hasReview = false,
  plan = null,
}: {
  id?: string;
  code?: string;
  departure?: Date;
  status?: BookingStatus;
  hasReview?: boolean;
  plan?: Plan | null;
} = {}): Booking {
  return new Booking({
    id,
    code,
    planDateId: 'pd',
    travelerId: 'v',
    pax: 2,
    totalAmount: 190000,
    status,
    createdAt: new Date(2026, 9, 1),
    departureAt: departure ?? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    hasReview,
    plan,
  });
}
