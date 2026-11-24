import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';

import type { Booking } from '@/core';

/**
 * Lo que en Flutter viajaba con la navegación y Expo Router no tiene (gotchas 5 y 7):
 *
 * - `extra` (la reserva que ya tenía la lista): `adelantarReserva(b)` antes de navegar y la
 *   pantalla destino la toma con `reservaAdelantada(id)`, SOLO si es la del id de la URL. Abierta
 *   en frío (recarga web, enlace directo) no hay nada adelantado y la pantalla carga por id.
 * - `pop(resultado)`: la pantalla que se cierra deja su resultado con `devolverResultado(ruta, v)`
 *   (el detalle, «hubo cambios»; la reseña, «publicada») y quien la abrió lo toma al recuperar el
 *   foco (`useAlVolver`). El detalle lo deja en cuanto cambia algo, no al cerrarse: así también
 *   vale si se sale con el gesto atrás de iOS, que no pasa por ningún código de la pantalla.
 *
 * Es estado de módulo (vive mientras viva la app), pequeño y consumible: cada resultado se lee
 * una sola vez.
 */

let adelantada: Booking | null = null;
const resultados = new Map<string, boolean>();

export function adelantarReserva(b: Booking): void {
  adelantada = b;
}

/** La reserva adelantada si es la del [bookingId] pedido; null si no hay o es otra. */
export function reservaAdelantada(bookingId: string): Booking | null {
  return adelantada?.id === bookingId ? adelantada : null;
}

export function olvidarReservaAdelantada(): void {
  adelantada = null;
}

/** La pantalla de [ruta] deja su resultado para quien la abrió (el valor de `pop`). */
export function devolverResultado(ruta: string, valor: boolean): void {
  resultados.set(ruta, valor);
}

/** El resultado que dejó la pantalla de [ruta] (y lo consume); undefined si no dejó nada. */
export function tomarResultado(ruta: string): boolean | undefined {
  const valor = resultados.get(ruta);
  resultados.delete(ruta);
  return valor;
}

/**
 * `await context.push<bool>(ruta)`: devuelve `abrir(ruta, alVolver)`, que olvida un resultado
 * viejo de esa ruta y recuerda a quién avisar; al volver a tener el foco la pantalla llama a
 * [alVolver] con lo que devolvió la de [ruta] (undefined si nada). Navegar es cosa de quien llama.
 */
export function useAlVolver() {
  const esperando = useRef<{ ruta: string; alVolver: (resultado: boolean | undefined) => void } | null>(null);

  useFocusEffect(
    useCallback(() => {
      const e = esperando.current;
      if (!e) return;
      esperando.current = null;
      e.alVolver(tomarResultado(e.ruta));
    }, []),
  );

  return useCallback((ruta: string, alVolver: (resultado: boolean | undefined) => void) => {
    tomarResultado(ruta);
    esperando.current = { ruta, alVolver };
  }, []);
}
