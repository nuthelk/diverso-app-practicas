import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';

import type { Booking } from '@/core';

/**
 * Lo que en Flutter viajaba con la navegación y Expo Router no tiene (gotchas 5 y 7):
 *
 * - `extra` (la reserva que ya tenía la lista): `preloadBooking(b)` antes de navegar y la
 *   pantalla destino la toma con `preloadedBooking(id)`, SOLO si es la del id de la URL. Abierta
 *   en frío (recarga web, enlace directo) no hay nada adelantado y la pantalla carga por id.
 * - `pop(resultado)`: la pantalla que se cierra deja su resultado con `returnResult(route, v)`
 *   (el detalle, «hubo cambios»; la reseña, «publicada») y quien la abrió lo toma al recuperar el
 *   foco (`useOnReturn`). El detalle lo deja en cuanto cambia algo, no al cerrarse: así también
 *   vale si se sale con el gesto atrás de iOS, que no pasa por ningún código de la pantalla.
 *
 * Es estado de módulo (vive mientras viva la app), pequeño y consumible: cada resultado se lee
 * una sola vez.
 */

let preloaded: Booking | null = null;
const results = new Map<string, boolean>();

export function preloadBooking(b: Booking): void {
  preloaded = b;
}

/** La reserva adelantada si es la del [bookingId] pedido; null si no hay o es otra. */
export function preloadedBooking(bookingId: string): Booking | null {
  return preloaded?.id === bookingId ? preloaded : null;
}

export function forgetPreloadedBooking(): void {
  preloaded = null;
}

/** La pantalla de [route] deja su resultado para quien la abrió (el valor de `pop`). */
export function returnResult(route: string, value: boolean): void {
  results.set(route, value);
}

/** El resultado que dejó la pantalla de [route] (y lo consume); undefined si no dejó nada. */
export function takeResult(route: string): boolean | undefined {
  const value = results.get(route);
  results.delete(route);
  return value;
}

/**
 * `await context.push<bool>(ruta)`: devuelve `open(route, onReturn)`, que olvida un resultado
 * viejo de esa ruta y recuerda a quién avisar; al volver a tener el foco la pantalla llama a
 * [onReturn] con lo que devolvió la de [route] (undefined si nada). Navegar es cosa de quien llama.
 */
export function useOnReturn() {
  const pending = useRef<{ route: string; onReturn: (result: boolean | undefined) => void } | null>(null);

  useFocusEffect(
    useCallback(() => {
      const e = pending.current;
      if (!e) return;
      pending.current = null;
      e.onReturn(takeResult(e.route));
    }, []),
  );

  return useCallback((route: string, onReturn: (result: boolean | undefined) => void) => {
    takeResult(route);
    pending.current = { route, onReturn };
  }, []);
}
