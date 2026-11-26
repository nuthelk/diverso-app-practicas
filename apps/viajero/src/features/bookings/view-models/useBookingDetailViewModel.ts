import { useCallback, useRef, useState } from 'react';

import type { Booking, BookingRepository, Public } from '@/core';
import { errorMessageFor } from '@/features/shared/error-message';

import { useBookingActionsViewModel, type Clock } from './useBookingActionsViewModel';

interface DetailState {
  booking: Booking | null;
  loadingNow: boolean;
  error: string | null;
  changed: boolean;
}

/**
 * ViewModel del detalle de una reserva (`/reservas/:bookingId`, `ReservaDetalleViewModel`): la
 * reserva que ya tenía la lista ([initial]) se pinta de inmediato; sin ella (recarga en web,
 * enlace directo) se carga por id. Recuerda si algo cambió (cancelación, pago, reseña) para que,
 * al volver, «Mis reservas» se recargue.
 */
export function useBookingDetailViewModel({
  bookings,
  bookingId,
  initial = null,
  clock,
}: {
  bookings: Public<BookingRepository>;
  bookingId: string;
  initial?: Booking | null;
  clock?: Clock;
}) {
  const [state, setState] = useState<DetailState>({ booking: initial, loadingNow: false, error: null, changed: false });
  // Espejo para leer la reserva vigente dentro de los comandos (sin cierres viejos).
  const latest = useRef(state);
  const update = useCallback((f: (e: DetailState) => DetailState) => {
    latest.current = f(latest.current);
    setState(latest.current);
  }, []);

  // `notify` sale de las acciones, que necesitan `load`: se enlazan por ref.
  const notifyRef = useRef<(text: string) => void>(() => {});

  /** Trae la reserva del backend. Si ya había una a la vista y falla, la deja y avisa. */
  const load = useCallback(async (): Promise<void> => {
    update((e) => ({ ...e, loadingNow: true, error: null }));
    try {
      const fresh = await bookings.booking(bookingId);
      // `booking(id)` no sabe si ya se reseñó: no se pierde lo que la lista ya había marcado.
      update((e) => ({ ...e, booking: e.booking?.hasReview ? fresh.withReview() : fresh, loadingNow: false }));
    } catch (e) {
      console.warn('BookingDetailViewModel.load:', e);
      if (latest.current.booking !== null) {
        update((s) => ({ ...s, loadingNow: false }));
        notifyRef.current('No pudimos actualizar la reserva.');
      } else {
        update((s) => ({ ...s, loadingNow: false, error: errorMessageFor(e) }));
      }
    }
  }, [bookings, bookingId, update]);

  const actions = useBookingActionsViewModel({ bookings, clock, load });
  notifyRef.current = actions.notify;
  const baseCancel = actions.cancel;

  /**
   * Cancelar siempre deja la lista por recargar, aunque el servidor la rechace (su estado puede
   * haber cambiado).
   */
  const cancel = useCallback(
    (b: Booking) => {
      update((e) => ({ ...e, changed: true }));
      return baseCancel(b);
    },
    [baseCancel, update],
  );

  /** El viajero salió del pago (terminó o lo cerró): cambió la reserva o puede haber cambiado. */
  const paymentAttempted = useCallback(() => {
    update((e) => ({ ...e, changed: true }));
    return load();
  }, [load, update]);

  /** La reseña se publicó: ya no se ofrece «Reseñar». */
  const reviewPublished = useCallback(() => {
    update((e) => ({ ...e, changed: true, booking: e.booking?.withReview() ?? null }));
  }, [update]);

  return {
    ...actions,
    /** Null mientras se carga por primera vez o si esa carga falló. */
    booking: state.booking,
    loading: state.loadingNow || (state.booking === null && state.error === null),
    /** Motivo si no se pudo cargar la reserva (con una ya a la vista, un fallo solo se avisa). */
    error: state.error,
    /** Si hubo un cambio que «Mis reservas» debe recargar. */
    changed: state.changed,
    load,
    cancel,
    paymentAttempted,
    reviewPublished,
  };
}

export type BookingDetailViewModel = ReturnType<typeof useBookingDetailViewModel>;
