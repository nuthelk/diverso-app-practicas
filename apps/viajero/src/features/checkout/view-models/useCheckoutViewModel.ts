import * as Haptics from 'expo-haptics';

import { DiversoError, type Booking, type BookingRepository, type Plan, type PlanDate, type Public } from '@/core';

import { PaymentOutcome, type OpenPayment } from '../payment-outcome';
import { useLiveState } from './use-live-state';

/** Máximo de personas por reserva. */
export const MAX_TRAVELERS = 20;

const CLOSED_MESSAGE =
  'Cerraste el pago antes de terminar. Si ya pagaste, toca «Ya pagué, verificar»; ' +
  'si no, vuelve a intentarlo (tus cupos siguen retenidos unos minutos).';

/** `HapticFeedback.mediumImpact()`: en web (o sin motor de vibración) no hace nada. */
function vibrateMedium(): void {
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  } catch {
    // Sin soporte en esta plataforma.
  }
}

interface CheckoutState {
  /** Hay una reserva, un pago o una cancelación en curso: los botones se bloquean. */
  processing: boolean;
  /** Web: la misma pestaña ya navega a Wompi. */
  redirected: boolean;
  /** Mensaje para el usuario del último intento que falló. */
  error: string | null;
  pax: number;
  /**
   * Reserva de este checkout (creada aquí o retomada de [pending]). Si el pago no se completa,
   * se reutiliza en el reintento y deja de poderse cambiar el número de viajeros.
   */
  bookingId: string | null;
  /**
   * Reserva pendiente de pago de esta fecha que el viajero ya tenía; mientras exista, el checkout
   * ofrece completarla o cancelarla en vez de crear otra.
   */
  pending: Booking | null;
}

/**
 * ViewModel del checkout (`CheckoutViewModel`): crea la reserva atómica (cupos retenidos 30 min)
 * y pide a la pasarela abrir el pago de prueba de Wompi.
 *
 * Regla anti-duplicados (gotcha 9): por viajero y fecha hay a lo sumo UNA reserva pendiente de
 * pago. Si ya existe (p. ej. volvió atrás desde Wompi), `pay` no crea otra: expone [pending]
 * para que el viajero la complete o la cancele. [vibrate] se inyecta en las pruebas.
 */
export function useCheckoutViewModel(
  { bookings }: { bookings: Pick<Public<BookingRepository>, 'pendingBooking' | 'createBooking' | 'cancel'> },
  { vibrate = vibrateMedium }: { vibrate?: () => void } = {},
) {
  const { state, latest, update, notify } = useLiveState<CheckoutState>(() => ({
    processing: false,
    redirected: false,
    error: null,
    pax: 1,
    bookingId: null,
    pending: null,
  }));

  /** El número de viajeros ya no cambia una vez hay reserva (creada o pendiente). */
  const travelersLocked = (e: CheckoutState) => e.bookingId !== null || e.pending !== null;

  const setPax = (value: number) => {
    if (travelersLocked(latest.current)) return;
    update({ pax: Math.min(Math.max(value, 1), MAX_TRAVELERS) });
  };

  /**
   * Busca (al abrir el checkout) si ya hay una reserva pendiente vigente para [planDate]. Es solo para
   * mostrar el aviso antes de pagar; la guarda real está en [pay].
   */
  const loadPending = async (planDate: PlanDate): Promise<void> => {
    try {
      update({ pending: await bookings.pendingBooking(planDate.id) }, false);
    } catch (e) {
      console.warn('CheckoutViewModel.loadPending:', e);
      update({ pending: null }, false);
    }
    notify();
  };

  const open = async (openPayment: OpenPayment) => {
    const outcome = await openPayment(latest.current.bookingId!);
    if (outcome === PaymentOutcome.redirected) update({ redirected: true }, false);
    if (outcome === PaymentOutcome.closed) update({ error: CLOSED_MESSAGE }, false);
  };

  const run = async (action: () => Promise<void>) => {
    update({ processing: true, error: null });
    vibrate();
    try {
      await action();
    } catch (e) {
      if (e instanceof DiversoError) {
        update({ error: e.userMessage }, false);
      } else {
        console.warn('CheckoutViewModel.run:', e);
        update({ error: 'No pudimos iniciar el pago. Intenta de nuevo.' }, false);
      }
    }
    update({ processing: false });
  };

  /**
   * Reserva (una sola vez) y delega en [openPayment] el cobro con Wompi. [openPayment] dice cómo
   * terminó: si el viajero lo cerró sin terminar queda un aviso; los errores quedan en [error].
   */
  const pay = async (planDate: PlanDate, openPayment: OpenPayment): Promise<void> => {
    if (latest.current.processing || latest.current.redirected) return;
    await run(async () => {
      if (latest.current.bookingId === null) {
        const existing = await bookings.pendingBooking(planDate.id);
        if (existing !== null) {
          update({ pending: existing }, false);
          return;
        }
        try {
          const created = await bookings.createBooking({ planDateId: planDate.id, pax: latest.current.pax });
          update({ bookingId: created.bookingId }, false);
        } catch (e) {
          // El servidor también impide la segunda pendiente (otra pestaña o dispositivo la abrió
          // entre la consulta y el alta): se muestra el mismo aviso en vez de un error.
          if (!(e instanceof DiversoError) || e.code !== 'RESERVA_PENDIENTE_EXISTENTE') throw e;
          const pending = await bookings.pendingBooking(planDate.id);
          update({ pending }, false);
          if (pending === null) throw e;
          return;
        }
      }
      await open(openPayment);
    });
  };

  /** Retoma [pending]: mismo id y mismas personas, sin crear otra reserva. */
  const completePending = async (openPayment: OpenPayment): Promise<void> => {
    const booking = latest.current.pending;
    if (booking === null || latest.current.processing || latest.current.redirected) return;
    await run(async () => {
      update({ bookingId: booking.id, pax: booking.pax, pending: null }, false);
      await open(openPayment);
    });
  };

  /**
   * Cancela [pending] (reservas-cancelar: sin pago no hay reembolso y se liberan los cupos) para
   * que el viajero empiece de nuevo.
   */
  const cancelPending = async (): Promise<void> => {
    const booking = latest.current.pending;
    if (booking === null || latest.current.processing) return;
    await run(async () => {
      await bookings.cancel(booking.id);
      update({ pending: null }, false);
    });
  };

  const locked = travelersLocked(state);
  return {
    processing: state.processing,
    error: state.error,
    pax: state.pax,
    bookingId: state.bookingId,
    pending: state.pending,
    canRemoveTraveler: !locked && state.pax > 1,
    /** Se puede sumar otra persona mientras haya [availableSpots] en la fecha y no se pase del máximo. */
    canAddTraveler: (availableSpots: number) => !locked && state.pax < availableSpots && state.pax < MAX_TRAVELERS,
    /**
     * «Pagar con Wompi» se bloquea mientras algo está en curso, hay una pendiente por resolver o
     * (web) la misma pestaña ya navega a Wompi: un segundo toque antes de que la página se
     * descargue abriría otro intento de pago de la misma reserva.
     */
    canPay: !state.processing && !state.redirected && state.pending === null,
    total: (plan: Plan) => plan.priceCop * state.pax,
    setPax,
    loadPending,
    pay,
    completePending,
    cancelPending,
  };
}

export type CheckoutViewModel = ReturnType<typeof useCheckoutViewModel>;
