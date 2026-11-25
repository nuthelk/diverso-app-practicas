import { useCallback, useState } from 'react';

import type { Booking, BookingRepository, Public } from '@/core';

import { useReservaAcciones, type Reloj } from './useReservaAcciones';

interface EstadoLista {
  lista: readonly Booking[];
  cargando: boolean;
  error: string | null;
}

const vacia: readonly Booking[] = Object.freeze([]);

/**
 * ViewModel de «Mis reservas» (`BookingsViewModel`): carga la lista, la separa en próximas e
 * historial por la salida y ejecuta cancelaciones (las acciones y el aviso vienen de
 * `useReservaAcciones`). `activas` e `historial` se calculan en cada render con el reloj (no se
 * cachean). No carga solo: la vista llama `cargar()` al montarse.
 */
export function useBookingsViewModel({ reservas, reloj }: { reservas: Public<BookingRepository>; reloj?: Reloj }) {
  const [estado, setEstado] = useState<EstadoLista>({ lista: vacia, cargando: true, error: null });

  /** Pide la lista; [enSegundoPlano] deja la actual a la vista (sin «cargando») hasta que llega. */
  const pedir = useCallback(async (enSegundoPlano: boolean): Promise<void> => {
    setEstado((e) => (enSegundoPlano ? { ...e, error: null } : { ...e, cargando: true, error: null }));
    try {
      const lista = Object.freeze([...(await reservas.misReservas())]);
      setEstado({ lista, cargando: false, error: null });
    } catch (e) {
      console.warn('BookingsViewModel.cargar:', e);
      setEstado((s) => ({ ...s, cargando: false, error: 'No pudimos cargar tus reservas.' }));
    }
  }, [reservas]);

  /** Carga con «cargando» (la vista muestra el esqueleto): al abrir y al reintentar. */
  const cargar = useCallback(() => pedir(false), [pedir]);

  /**
   * Vuelve a pedir la lista SIN pasar por «cargando»: la vista no desmonta la lista (no vuelve al
   * esqueleto) y conserva el desplazamiento hasta que llega la nueva. Si falla, avisa igual que
   * [cargar].
   */
  const refrescar = useCallback(() => pedir(true), [pedir]);

  const acciones = useReservaAcciones({ reservas, reloj, cargar });
  const { esVigente } = acciones;

  /** Próximas: pendientes o confirmadas que aún no salen, la salida más cercana primero. */
  const activas = estado.lista.filter(esVigente).sort((a, b) => a.departure!.getTime() - b.departure!.getTime());

  /** Historial: todo lo demás, la salida más reciente primero (las que no tienen salida, al final). */
  const historial = estado.lista
    .filter((b) => !esVigente(b))
    .sort((a, b) => {
      const sa = a.departure;
      const sb = b.departure;
      if (sa === null || sb === null) return sa === sb ? 0 : sa === null ? 1 : -1;
      return sb.getTime() - sa.getTime();
    });

  return {
    reservas: estado.lista,
    cargando: estado.cargando,
    /** Mensaje para el usuario si la carga falló. */
    error: estado.error,
    activas,
    historial,
    cargar,
    refrescar,
    ...acciones,
  };
}

export type BookingsViewModel = ReturnType<typeof useBookingsViewModel>;
