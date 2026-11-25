import { DiversoError } from '../../errors/diverso-error';
import { Booking } from '../../models/booking';
import { CreatedBooking } from '../../models/created-booking';
import { asDouble, asString, asStringOr } from '../../models/row';
import { CancellationResult, CancellationPreview } from '../../models/refund';
import { parsearFecha } from '../../utils/fechas';
import type { BookingApi } from '../services/booking-api';
import type { EdgeFunctionsApi } from '../services/edge-functions-api';
import { llamarEdgeFunction } from './llamar-edge-function';

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
  async crearReserva({ planDateId, pax }: { planDateId: string; pax: number }): Promise<CreatedBooking> {
    try {
      const map = await this.api.crearReserva({ planDateId, pax });
      return new CreatedBooking({
        bookingId: asString(map['booking_id']),
        code: asString(map['codigo']),
        totalAmount: asDouble(map['monto_total']),
        planTitle: asStringOr(map['plan_titulo'], ''),
        date: map['fecha'] == null ? null : parsearFecha(String(map['fecha'])),
      });
    } catch (e) {
      throw DiversoError.fromPostgrest(e);
    }
  }

  /**
   * Reservas del viajero autenticado con plan, agencia y pagos embebidos, marcadas si ya tienen
   * reseña. Sin sesión: `[]` sin consultar. NO traduce errores (como en Dart).
   */
  async misReservas(): Promise<Booking[]> {
    const uid = await this.api.usuarioId();
    if (uid === null) return [];
    const bookings = (await this.api.reservasDe(uid)).map(Booking.fromMap);

    // Marca cuáles ya tienen reseña (habilita el botón en las que no).
    if (bookings.length > 0) {
      const resenas = await this.api.resenasDe(uid);
      const conResena = new Set(resenas.map((e) => asString(e['booking_id'])));
      return bookings.map((b) => (b.hasReview || conResena.has(b.id) ? b.withReview() : b));
    }
    return bookings;
  }

  /**
   * Una reserva propia cargada del backend (confirmación `/reserva/:bookingId` y detalle
   * `/reservas/:bookingId`), marcada si ya tiene reseña. Si no existe: `RESERVA_NO_EXISTE`.
   */
  async reserva(bookingId: string): Promise<Booking> {
    try {
      const res = await this.api.reserva(bookingId);
      if (res === null) throw new DiversoError('RESERVA_NO_EXISTE');
      const booking = Booking.fromMap(res);
      // Igual que en misReservas: sin esto, el detalle cargado en frío ofrecería «Reseñar» de nuevo.
      const resena = await this.api.resenaDe(bookingId);
      return resena === null ? booking : booking.withReview();
    } catch (e) {
      if (e instanceof DiversoError) throw e;
      throw DiversoError.fromPostgrest(e);
    }
  }

  /**
   * Reserva propia de esta fecha que sigue pendiente de pago y con la retención vigente, si
   * existe. El checkout la reutiliza en vez de crear otra (que retendría cupos dos veces).
   */
  async reservaPendiente(planDateId: string): Promise<Booking | null> {
    const uid = await this.api.usuarioId();
    if (uid === null) return null;
    try {
      const desde = new Date(Date.now() - Booking.holdMs);
      const res = await this.api.pendientesDe({ viajeroId: uid, planDateId, creadaDespuesDe: desde });
      return res.length === 0 ? null : Booking.fromMap(res[0]!);
    } catch (e) {
      throw DiversoError.fromPostgrest(e);
    }
  }

  /** Reembolso que daría la política del plan si se cancelara AHORA (solo lectura). */
  async vistaPreviaCancelacion(bookingId: string): Promise<CancellationPreview> {
    try {
      return CancellationPreview.fromMap(await this.api.vistaPreviaCancelacion(bookingId));
    } catch (e) {
      throw DiversoError.fromPostgrest(e);
    }
  }

  /**
   * Cancela con la política del plan (Edge Function `reservas-cancelar`, que también pide el
   * reembolso de prueba a Wompi). Es idempotente.
   */
  async cancelar(bookingId: string): Promise<CancellationResult> {
    const res = await llamarEdgeFunction(this.edgeFunctions, 'reservas-cancelar', { booking_id: bookingId });
    return CancellationResult.fromMap(res);
  }
}
