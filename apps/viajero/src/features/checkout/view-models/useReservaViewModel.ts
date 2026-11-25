import type { Booking, BookingRepository, Public } from '@/core';
import { errorMessageFor } from '@/features/shared/error-message';

import { useEstadoVivo } from './use-estado-vivo';

interface EstadoReserva {
  /** Null mientras se carga o si la carga falló. */
  reserva: Booking | null;
  cargando: boolean;
  /** Mensaje para el usuario si la carga falló. */
  error: string | null;
}

/**
 * ViewModel de `/reserva/:bookingId` (`ReservaViewModel`): carga la reserva por id para que la
 * confirmación sobreviva a recargar la página en web.
 */
export function useReservaViewModel(
  { reservas }: { reservas: Pick<Public<BookingRepository>, 'booking'> },
  { bookingId }: { bookingId: string },
) {
  const { estado, cambiar } = useEstadoVivo<EstadoReserva>(() => ({ reserva: null, cargando: true, error: null }));

  const cargar = async (): Promise<void> => {
    cambiar({ cargando: true, error: null });
    try {
      cambiar({ reserva: await reservas.booking(bookingId) }, false);
    } catch (e) {
      console.warn('ReservaViewModel.cargar:', e);
      cambiar({ error: errorMessageFor(e) }, false);
    } finally {
      cambiar({ cargando: false });
    }
  };

  return { ...estado, cargar };
}

export type ReservaViewModel = ReturnType<typeof useReservaViewModel>;
