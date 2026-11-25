import { useCallback, useRef, useState } from 'react';

import type { Booking, BookingRepository, Public, CancellationPreview } from '@/core';
import { errorMessageFor } from '@/features/shared/error-message';

import { mensajeCancelacion } from '../reserva-formato';

/** El reloj de la app: los VM lo reciben para poder fijarlo en las pruebas. */
export type Reloj = () => Date;
export const relojDelSistema: Reloj = () => new Date();

/**
 * Lo que comparten «Mis reservas» y el detalle de la reserva (`ReservaAccionesViewModel`, que en
 * Flutter es una clase abstracta): el aviso (snackbar) que la vista muestra y consume, la vista
 * previa y la ejecución de la cancelación, y las reglas de qué se puede hacer con una reserva según
 * el reloj. Cada pantalla decide qué recargar: pasa su [cargar] (se lee en cada llamada, así puede
 * definirse después de este hook).
 *
 * Las reglas del reloj se calculan en CADA llamada (gotcha 10): nada se cachea.
 */
export function useReservaAcciones({
  reservas,
  reloj = relojDelSistema,
  cargar,
}: {
  reservas: Public<BookingRepository>;
  reloj?: Reloj;
  cargar: () => Promise<void>;
}) {
  const [mensaje, setMensaje] = useState<string | null>(null);
  const cargarActual = useRef(cargar);
  cargarActual.current = cargar;
  const relojActual = useRef(reloj);
  relojActual.current = reloj;

  /** Pendiente o confirmada y que aún no sale (ver `Booking.vigente`), según el reloj del VM. */
  const esVigente = useCallback((b: Booking) => b.isActive(relojActual.current()), []);
  const puedeCancelar = esVigente;
  const puedeResenar = useCallback((b: Booking) => b.canReview(relojActual.current()), []);

  /** Deja [texto] como aviso para la vista. */
  const avisar = useCallback((texto: string) => setMensaje(texto), []);

  /**
   * La vista ya mostró el aviso. En Flutter no notifica (el oyente lo volvería a mostrar); aquí
   * la vista lo muestra desde un efecto sobre el texto, así que volver a null no lo repite.
   */
  const limpiarMensaje = useCallback(() => setMensaje(null), []);

  /**
   * Reembolso que daría la política del plan si se cancelara ahora; null si no se pudo consultar
   * (el motivo queda en `mensaje`).
   */
  const vistaPrevia = useCallback(
    async (b: Booking): Promise<CancellationPreview | null> => {
      setMensaje(null);
      try {
        return await reservas.cancellationPreview(b.id);
      } catch (e) {
        console.warn('ReservaAccionesViewModel.vistaPrevia:', e);
        setMensaje(errorMessageFor(e));
        return null;
      }
    },
    [reservas],
  );

  /**
   * Cancela [b], avisa con el reembolso y recarga. `false` si el servidor la rechazó (el motivo
   * queda en `mensaje`).
   */
  const cancelar = useCallback(
    async (b: Booking): Promise<boolean> => {
      setMensaje(null);
      try {
        const resultado = await reservas.cancel(b.id);
        setMensaje(mensajeCancelacion(resultado));
      } catch (e) {
        console.warn('ReservaAccionesViewModel.cancelar:', e);
        setMensaje(errorMessageFor(e));
        return false;
      }
      await cargarActual.current();
      return true;
    },
    [reservas],
  );

  return { mensaje, avisar, limpiarMensaje, esVigente, puedeCancelar, puedeResenar, vistaPrevia, cancelar };
}

export type ReservaAcciones = ReturnType<typeof useReservaAcciones>;
