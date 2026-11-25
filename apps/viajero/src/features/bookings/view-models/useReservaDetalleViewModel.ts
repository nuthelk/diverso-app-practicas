import { useCallback, useRef, useState } from 'react';

import type { Booking, BookingRepository, Public } from '@/core';
import { errorMessageFor } from '@/features/shared/error-message';

import { useReservaAcciones, type Reloj } from './useReservaAcciones';

interface EstadoDetalle {
  reserva: Booking | null;
  cargandoAhora: boolean;
  error: string | null;
  cambio: boolean;
}

/**
 * ViewModel del detalle de una reserva (`/reservas/:bookingId`, `ReservaDetalleViewModel`): la
 * reserva que ya tenía la lista ([inicial]) se pinta de inmediato; sin ella (recarga en web,
 * enlace directo) se carga por id. Recuerda si algo cambió (cancelación, pago, reseña) para que,
 * al volver, «Mis reservas» se recargue.
 */
export function useReservaDetalleViewModel({
  reservas,
  bookingId,
  inicial = null,
  reloj,
}: {
  reservas: Public<BookingRepository>;
  bookingId: string;
  inicial?: Booking | null;
  reloj?: Reloj;
}) {
  const [estado, setEstado] = useState<EstadoDetalle>({ reserva: inicial, cargandoAhora: false, error: null, cambio: false });
  // Espejo para leer la reserva vigente dentro de los comandos (sin cierres viejos).
  const actual = useRef(estado);
  const cambiar = useCallback((f: (e: EstadoDetalle) => EstadoDetalle) => {
    actual.current = f(actual.current);
    setEstado(actual.current);
  }, []);

  // `avisar` sale de las acciones, que necesitan `cargar`: se enlazan por ref.
  const avisarRef = useRef<(texto: string) => void>(() => {});

  /** Trae la reserva del backend. Si ya había una a la vista y falla, la deja y avisa. */
  const cargar = useCallback(async (): Promise<void> => {
    cambiar((e) => ({ ...e, cargandoAhora: true, error: null }));
    try {
      const nueva = await reservas.booking(bookingId);
      // `reserva(id)` no sabe si ya se reseñó: no se pierde lo que la lista ya había marcado.
      cambiar((e) => ({ ...e, reserva: e.reserva?.hasReview ? nueva.withReview() : nueva, cargandoAhora: false }));
    } catch (e) {
      console.warn('ReservaDetalleViewModel.cargar:', e);
      if (actual.current.reserva !== null) {
        cambiar((s) => ({ ...s, cargandoAhora: false }));
        avisarRef.current('No pudimos actualizar la reserva.');
      } else {
        cambiar((s) => ({ ...s, cargandoAhora: false, error: errorMessageFor(e) }));
      }
    }
  }, [reservas, bookingId, cambiar]);

  const acciones = useReservaAcciones({ reservas, reloj, cargar });
  avisarRef.current = acciones.avisar;
  const cancelarBase = acciones.cancelar;

  /**
   * Cancelar siempre deja la lista por recargar, aunque el servidor la rechace (su estado puede
   * haber cambiado).
   */
  const cancelar = useCallback(
    (b: Booking) => {
      cambiar((e) => ({ ...e, cambio: true }));
      return cancelarBase(b);
    },
    [cancelarBase, cambiar],
  );

  /** El viajero salió del pago (terminó o lo cerró): cambió la reserva o puede haber cambiado. */
  const pagoIntentado = useCallback(() => {
    cambiar((e) => ({ ...e, cambio: true }));
    return cargar();
  }, [cargar, cambiar]);

  /** La reseña se publicó: ya no se ofrece «Reseñar». */
  const resenaPublicada = useCallback(() => {
    cambiar((e) => ({ ...e, cambio: true, reserva: e.reserva?.withReview() ?? null }));
  }, [cambiar]);

  return {
    ...acciones,
    /** Null mientras se carga por primera vez o si esa carga falló. */
    reserva: estado.reserva,
    cargando: estado.cargandoAhora || (estado.reserva === null && estado.error === null),
    /** Motivo si no se pudo cargar la reserva (con una ya a la vista, un fallo solo se avisa). */
    error: estado.error,
    /** Si hubo un cambio que «Mis reservas» debe recargar. */
    cambio: estado.cambio,
    cargar,
    cancelar,
    pagoIntentado,
    resenaPublicada,
  };
}

export type ReservaDetalleViewModel = ReturnType<typeof useReservaDetalleViewModel>;
