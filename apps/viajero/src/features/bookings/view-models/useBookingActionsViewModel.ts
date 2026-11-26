import { useCallback, useRef, useState } from 'react';

import type { Booking, BookingRepository, Public, CancellationPreview } from '@/core';
import { errorMessageFor } from '@/features/shared/error-message';

import { cancellationMessage } from '../booking-format';

/** El reloj de la app: los VM lo reciben para poder fijarlo en las pruebas. */
export type Clock = () => Date;
export const systemClock: Clock = () => new Date();

/**
 * Lo que comparten «Mis reservas» y el detalle de la reserva (`ReservaAccionesViewModel`, que en
 * Flutter es una clase abstracta): el aviso (snackbar) que la vista muestra y consume, la vista
 * previa y la ejecución de la cancelación, y las reglas de qué se puede hacer con una reserva según
 * el reloj. Cada pantalla decide qué recargar: pasa su [load] (se lee en cada llamada, así puede
 * definirse después de este hook).
 *
 * Las reglas del reloj se calculan en CADA llamada (gotcha 10): nada se cachea.
 */
export function useBookingActionsViewModel({
  bookings,
  clock = systemClock,
  load,
}: {
  bookings: Public<BookingRepository>;
  clock?: Clock;
  load: () => Promise<void>;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const latestLoad = useRef(load);
  latestLoad.current = load;
  const latestClock = useRef(clock);
  latestClock.current = clock;

  /** Pendiente o confirmada y que aún no sale (ver `Booking.isActive`), según el reloj del VM. */
  const isActive = useCallback((b: Booking) => b.isActive(latestClock.current()), []);
  const canCancel = isActive;
  const canReview = useCallback((b: Booking) => b.canReview(latestClock.current()), []);

  /** Deja [text] como aviso para la vista. */
  const notify = useCallback((text: string) => setMessage(text), []);

  /**
   * La vista ya mostró el aviso. En Flutter no notifica (el oyente lo volvería a mostrar); aquí
   * la vista lo muestra desde un efecto sobre el texto, así que volver a null no lo repite.
   */
  const clearMessage = useCallback(() => setMessage(null), []);

  /**
   * Reembolso que daría la política del plan si se cancelara ahora; null si no se pudo consultar
   * (el motivo queda en `message`).
   */
  const cancellationPreview = useCallback(
    async (b: Booking): Promise<CancellationPreview | null> => {
      setMessage(null);
      try {
        return await bookings.cancellationPreview(b.id);
      } catch (e) {
        console.warn('BookingActionsViewModel.cancellationPreview:', e);
        setMessage(errorMessageFor(e));
        return null;
      }
    },
    [bookings],
  );

  /**
   * Cancela [b], avisa con el reembolso y recarga. `false` si el servidor la rechazó (el motivo
   * queda en `message`).
   */
  const cancel = useCallback(
    async (b: Booking): Promise<boolean> => {
      setMessage(null);
      try {
        const result = await bookings.cancel(b.id);
        setMessage(cancellationMessage(result));
      } catch (e) {
        console.warn('BookingActionsViewModel.cancel:', e);
        setMessage(errorMessageFor(e));
        return false;
      }
      await latestLoad.current();
      return true;
    },
    [bookings],
  );

  return { message, notify, clearMessage, isActive, canCancel, canReview, cancellationPreview, cancel };
}

export type BookingActionsViewModel = ReturnType<typeof useBookingActionsViewModel>;
