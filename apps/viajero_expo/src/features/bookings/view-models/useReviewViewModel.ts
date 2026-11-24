import { useCallback, useRef, useState } from 'react';

import type { Booking, BookingRepository, Publico, ReviewRepository } from '@/core';
import { mensajeDeError } from '@/features/compartido/mensaje-de-error';

import { relojDelSistema, type Reloj } from './useReservaAcciones';

/** Estrellas con las que empieza el formulario y máximo posible. */
export const CALIFICACION_INICIAL = 5;
export const MAX_ESTRELLAS = 5;

interface EstadoResena {
  reserva: Booking | null;
  cargandoAhora: boolean;
  error: string | null;
  calificacion: number;
  enviando: boolean;
  publicada: boolean;
  errorEnvio: string | null;
}

/**
 * ViewModel de la reseña (`/resena/:bookingId`, `ReviewViewModel`): carga la reserva por id (o
 * usa la que ya tenía «Mis reservas»: [adelantada], solo si es la del id pedido), decide si se
 * puede reseñar, guarda la calificación elegida y publica la reseña.
 */
export function useReviewViewModel({
  reservas,
  resenas,
  bookingId,
  adelantada = null,
  reloj = relojDelSistema,
}: {
  reservas: Publico<BookingRepository>;
  resenas: Publico<ReviewRepository>;
  bookingId: string;
  adelantada?: Booking | null;
  reloj?: Reloj;
}) {
  const inicial: EstadoResena = {
    reserva: adelantada !== null && adelantada.id === bookingId ? adelantada : null,
    cargandoAhora: false,
    error: null,
    calificacion: CALIFICACION_INICIAL,
    enviando: false,
    publicada: false,
    errorEnvio: null,
  };
  const [estado, setEstado] = useState<EstadoResena>(inicial);
  // Espejo que leen los comandos: un doble toque ve que ya se está enviando.
  const actual = useRef(estado);
  const cambiar = useCallback((cambios: Partial<EstadoResena>) => {
    actual.current = { ...actual.current, ...cambios };
    setEstado(actual.current);
  }, []);

  /** Trae la reserva del backend; si ya se tiene (la de «Mis reservas»), no hace nada. */
  const cargar = useCallback(async (): Promise<void> => {
    if (actual.current.reserva !== null) return;
    cambiar({ cargandoAhora: true, error: null });
    try {
      cambiar({ reserva: await reservas.reserva(bookingId), cargandoAhora: false });
    } catch (e) {
      console.warn('ReviewViewModel.cargar:', e);
      cambiar({ error: mensajeDeError(e), cargandoAhora: false });
    }
  }, [reservas, bookingId, cambiar]);

  /** Elige de 1 a `MAX_ESTRELLAS` estrellas; otro valor se ignora. */
  const calificar = useCallback(
    (estrellas: number) => {
      if (estrellas < 1 || estrellas > MAX_ESTRELLAS || estrellas === actual.current.calificacion) return;
      cambiar({ calificacion: estrellas });
    },
    [cambiar],
  );

  /**
   * Publica la reseña. `false` si ya hay un envío en curso, ya se publicó o el servidor la rechazó
   * (el motivo queda en `errorEnvio` y se puede reintentar).
   */
  const enviar = useCallback(
    async (comentario: string): Promise<boolean> => {
      if (actual.current.enviando || actual.current.publicada) return false;
      cambiar({ enviando: true, errorEnvio: null });
      try {
        await resenas.crear({ bookingId, calificacion: actual.current.calificacion, comentario });
        cambiar({ publicada: true, enviando: false });
        return true;
      } catch (e) {
        console.warn('ReviewViewModel.enviar:', e);
        cambiar({ errorEnvio: mensajeDeError(e), enviando: false });
        return false;
      }
    },
    [resenas, bookingId, cambiar],
  );

  return {
    /** Null mientras se carga o si la carga falló. */
    reserva: estado.reserva,
    cargando: estado.cargandoAhora || (estado.reserva === null && estado.error === null),
    /** Motivo si no se pudo cargar la reserva. */
    error: estado.error,
    /** Solo se reseñan los viajes ya realizados, confirmados y sin reseña (el servidor lo exige). */
    puedeResenar: estado.reserva?.puedeResenar(reloj()) ?? false,
    calificacion: estado.calificacion,
    enviando: estado.enviando,
    /** La reseña ya se publicó: la pantalla se cierra y el botón no vuelve a activarse. */
    publicada: estado.publicada,
    /** Motivo si el servidor rechazó la última reseña. */
    errorEnvio: estado.errorEnvio,
    cargar,
    calificar,
    enviar,
  };
}

export type ReviewViewModel = ReturnType<typeof useReviewViewModel>;
