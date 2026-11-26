import { useCallback, useRef, useState } from 'react';

import type { Booking, BookingRepository, Public, ReviewRepository } from '@/core';
import { errorMessageFor } from '@/features/shared/error-message';

import { systemClock, type Clock } from './useBookingActionsViewModel';

/** Estrellas con las que empieza el formulario y máximo posible. */
export const INITIAL_RATING = 5;
export const MAX_STARS = 5;

interface ReviewState {
  booking: Booking | null;
  loadingNow: boolean;
  error: string | null;
  rating: number;
  submitting: boolean;
  published: boolean;
  submitError: string | null;
}

/**
 * ViewModel de la reseña (`/resena/:bookingId`, `ReviewViewModel`): carga la reserva por id (o
 * usa la que ya tenía «Mis reservas»: [preloaded], solo si es la del id pedido), decide si se
 * puede reseñar, guarda la calificación elegida y publica la reseña.
 */
export function useReviewViewModel({
  bookings,
  reviews,
  bookingId,
  preloaded = null,
  clock = systemClock,
}: {
  bookings: Public<BookingRepository>;
  reviews: Public<ReviewRepository>;
  bookingId: string;
  preloaded?: Booking | null;
  clock?: Clock;
}) {
  const initial: ReviewState = {
    booking: preloaded !== null && preloaded.id === bookingId ? preloaded : null,
    loadingNow: false,
    error: null,
    rating: INITIAL_RATING,
    submitting: false,
    published: false,
    submitError: null,
  };
  const [state, setState] = useState<ReviewState>(initial);
  // Espejo que leen los comandos: un doble toque ve que ya se está enviando.
  const latest = useRef(state);
  const update = useCallback((changes: Partial<ReviewState>) => {
    latest.current = { ...latest.current, ...changes };
    setState(latest.current);
  }, []);

  /** Trae la reserva del backend; si ya se tiene (la de «Mis reservas»), no hace nada. */
  const load = useCallback(async (): Promise<void> => {
    if (latest.current.booking !== null) return;
    update({ loadingNow: true, error: null });
    try {
      update({ booking: await bookings.booking(bookingId), loadingNow: false });
    } catch (e) {
      console.warn('ReviewViewModel.load:', e);
      update({ error: errorMessageFor(e), loadingNow: false });
    }
  }, [bookings, bookingId, update]);

  /** Elige de 1 a `MAX_STARS` estrellas; otro valor se ignora. */
  const rate = useCallback(
    (stars: number) => {
      if (stars < 1 || stars > MAX_STARS || stars === latest.current.rating) return;
      update({ rating: stars });
    },
    [update],
  );

  /**
   * Publica la reseña. `false` si ya hay un envío en curso, ya se publicó o el servidor la rechazó
   * (el motivo queda en `submitError` y se puede reintentar).
   */
  const submit = useCallback(
    async (comment: string): Promise<boolean> => {
      if (latest.current.submitting || latest.current.published) return false;
      update({ submitting: true, submitError: null });
      try {
        await reviews.create({ bookingId, rating: latest.current.rating, comment });
        update({ published: true, submitting: false });
        return true;
      } catch (e) {
        console.warn('ReviewViewModel.submit:', e);
        update({ submitError: errorMessageFor(e), submitting: false });
        return false;
      }
    },
    [reviews, bookingId, update],
  );

  return {
    /** Null mientras se carga o si la carga falló. */
    booking: state.booking,
    loading: state.loadingNow || (state.booking === null && state.error === null),
    /** Motivo si no se pudo cargar la reserva. */
    error: state.error,
    /** Solo se reseñan los viajes ya realizados, confirmados y sin reseña (el servidor lo exige). */
    canReview: state.booking?.canReview(clock()) ?? false,
    rating: state.rating,
    submitting: state.submitting,
    /** La reseña ya se publicó: la pantalla se cierra y el botón no vuelve a activarse. */
    published: state.published,
    /** Motivo si el servidor rechazó la última reseña. */
    submitError: state.submitError,
    load,
    rate,
    submit,
  };
}

export type ReviewViewModel = ReturnType<typeof useReviewViewModel>;
