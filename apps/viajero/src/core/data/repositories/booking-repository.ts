import { DiversoError } from '../../errors/diverso-error';
import { Booking } from '../../models/booking';
import { CreatedBooking } from '../../models/created-booking';
import { asDouble, asString, asStringOr } from '../../models/row';
import { CancellationResult, CancellationPreview } from '../../models/refund';
import { parseDate } from '../../utils/dates';
import type { BookingApi } from '../services/booking-api';
import type { EdgeFunctionsApi } from '../services/edge-functions-api';
import { callEdgeFunction } from './call-edge-function';

export class BookingRepository {
  private readonly api: BookingApi;
  private readonly edgeFunctions: EdgeFunctionsApi;

  constructor({ api, edgeFunctions }: { api: BookingApi; edgeFunctions: EdgeFunctionsApi }) {
    this.api = api;
    this.edgeFunctions = edgeFunctions;
  }

  /**
   * Crea la reserva decrementando cupos de forma atómica en el servidor (queda `pendiente_pago`).
   * Cualquier error → `DiversoError.fromPostgrest`.
   */
  async createBooking({ planDateId, pax }: { planDateId: string; pax: number }): Promise<CreatedBooking> {
    try {
      const map = await this.api.createBooking({ planDateId, pax });
      return new CreatedBooking({
        bookingId: asString(map['booking_id']),
        code: asString(map['codigo']),
        totalAmount: asDouble(map['monto_total']),
        planTitle: asStringOr(map['plan_titulo'], ''),
        date: map['fecha'] == null ? null : parseDate(String(map['fecha'])),
      });
    } catch (e) {
      throw DiversoError.fromPostgrest(e);
    }
  }

  /**
   * Reservas del viajero autenticado con plan, agencia y pagos embebidos, marcadas si ya tienen
   * reseña. Sin sesión: `[]` sin consultar. NO traduce errores (como en Dart).
   */
  async myBookings(): Promise<Booking[]> {
    const uid = await this.api.currentUserId();
    if (uid === null) return [];
    const bookings = (await this.api.bookingsOf(uid)).map(Booking.fromMap);

    // Marca cuáles ya tienen reseña (habilita el botón en las que no).
    if (bookings.length > 0) {
      const reviews = await this.api.reviewsOf(uid);
      const reviewedIds = new Set(reviews.map((e) => asString(e['booking_id'])));
      return bookings.map((b) => (b.hasReview || reviewedIds.has(b.id) ? b.withReview() : b));
    }
    return bookings;
  }

  /**
   * Una reserva propia cargada del backend (confirmación `/reserva/:bookingId` y detalle
   * `/reservas/:bookingId`), marcada si ya tiene reseña. Si no existe: `RESERVA_NO_EXISTE`.
   */
  async booking(bookingId: string): Promise<Booking> {
    try {
      const res = await this.api.booking(bookingId);
      if (res === null) throw new DiversoError('RESERVA_NO_EXISTE');
      const booking = Booking.fromMap(res);
      // Igual que en myBookings: sin esto, el detalle cargado en frío ofrecería «Reseñar» de nuevo.
      const review = await this.api.reviewOf(bookingId);
      return review === null ? booking : booking.withReview();
    } catch (e) {
      if (e instanceof DiversoError) throw e;
      throw DiversoError.fromPostgrest(e);
    }
  }

  /**
   * Reserva propia de esta fecha que sigue pendiente de pago y con la retención vigente, si
   * existe. El checkout la reutiliza en vez de crear otra (que retendría cupos dos veces).
   */
  async pendingBooking(planDateId: string): Promise<Booking | null> {
    const uid = await this.api.currentUserId();
    if (uid === null) return null;
    try {
      const since = new Date(Date.now() - Booking.holdMs);
      const res = await this.api.pendingOf({ travelerId: uid, planDateId, createdAfter: since });
      return res.length === 0 ? null : Booking.fromMap(res[0]!);
    } catch (e) {
      throw DiversoError.fromPostgrest(e);
    }
  }

  /** Reembolso que daría la política del plan si se cancelara AHORA (solo lectura). */
  async cancellationPreview(bookingId: string): Promise<CancellationPreview> {
    try {
      return CancellationPreview.fromMap(await this.api.cancellationPreview(bookingId));
    } catch (e) {
      throw DiversoError.fromPostgrest(e);
    }
  }

  /**
   * Cancela con la política del plan (Edge Function `reservas-cancelar`, que también pide el
   * reembolso de prueba a Wompi). Es idempotente.
   */
  async cancel(bookingId: string): Promise<CancellationResult> {
    const res = await callEdgeFunction(this.edgeFunctions, 'reservas-cancelar', { booking_id: bookingId });
    return CancellationResult.fromMap(res);
  }
}
