import type { Booking, BookingRepository, Public } from '@/core';
import { errorMessageFor } from '@/features/shared/error-message';

import { useLiveState } from './use-live-state';

interface BookingConfirmationState {
  /** Null mientras se carga o si la carga falló. */
  booking: Booking | null;
  loading: boolean;
  /** Mensaje para el usuario si la carga falló. */
  error: string | null;
}

/**
 * ViewModel de `/reserva/:bookingId` (`ReservaViewModel`): carga la reserva por id para que la
 * confirmación sobreviva a recargar la página en web.
 */
export function useBookingConfirmationViewModel(
  { bookings }: { bookings: Pick<Public<BookingRepository>, 'booking'> },
  { bookingId }: { bookingId: string },
) {
  const { state, update } = useLiveState<BookingConfirmationState>(() => ({ booking: null, loading: true, error: null }));

  const load = async (): Promise<void> => {
    update({ loading: true, error: null });
    try {
      update({ booking: await bookings.booking(bookingId) }, false);
    } catch (e) {
      console.warn('BookingConfirmationViewModel.load:', e);
      update({ error: errorMessageFor(e) }, false);
    } finally {
      update({ loading: false });
    }
  };

  return { ...state, load };
}

export type BookingConfirmationViewModel = ReturnType<typeof useBookingConfirmationViewModel>;
