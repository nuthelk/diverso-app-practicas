import { useCallback, useState } from 'react';

import type { Booking, BookingRepository, Public } from '@/core';

import { useBookingActionsViewModel, type Clock } from './useBookingActionsViewModel';

interface ListState {
  list: readonly Booking[];
  loading: boolean;
  error: string | null;
}

const EMPTY_LIST: readonly Booking[] = Object.freeze([]);

/**
 * ViewModel de «Mis reservas» (`BookingsViewModel`): carga la lista, la separa en próximas e
 * historial por la salida y ejecuta cancelaciones (las acciones y el aviso vienen de
 * `useBookingActionsViewModel`). `upcoming` e `history` se calculan en cada render con el reloj (no se
 * cachean). No carga solo: la vista llama `load()` al montarse.
 */
export function useBookingsViewModel({ bookings, clock }: { bookings: Public<BookingRepository>; clock?: Clock }) {
  const [state, setState] = useState<ListState>({ list: EMPTY_LIST, loading: true, error: null });

  /** Pide la lista; [inBackground] deja la actual a la vista (sin «cargando») hasta que llega. */
  const fetchList = useCallback(async (inBackground: boolean): Promise<void> => {
    setState((e) => (inBackground ? { ...e, error: null } : { ...e, loading: true, error: null }));
    try {
      const list = Object.freeze([...(await bookings.myBookings())]);
      setState({ list, loading: false, error: null });
    } catch (e) {
      console.warn('BookingsViewModel.load:', e);
      setState((s) => ({ ...s, loading: false, error: 'No pudimos cargar tus reservas.' }));
    }
  }, [bookings]);

  /** Carga con «cargando» (la vista muestra el esqueleto): al abrir y al reintentar. */
  const load = useCallback(() => fetchList(false), [fetchList]);

  /**
   * Vuelve a pedir la lista SIN pasar por «cargando»: la vista no desmonta la lista (no vuelve al
   * esqueleto) y conserva el desplazamiento hasta que llega la nueva. Si falla, avisa igual que
   * [load].
   */
  const refresh = useCallback(() => fetchList(true), [fetchList]);

  const actions = useBookingActionsViewModel({ bookings, clock, load });
  const { isActive } = actions;

  /** Próximas: pendientes o confirmadas que aún no salen, la salida más cercana primero. */
  const upcoming = state.list.filter(isActive).sort((a, b) => a.departure!.getTime() - b.departure!.getTime());

  /** Historial: todo lo demás, la salida más reciente primero (las que no tienen salida, al final). */
  const history = state.list
    .filter((b) => !isActive(b))
    .sort((a, b) => {
      const sa = a.departure;
      const sb = b.departure;
      if (sa === null || sb === null) return sa === sb ? 0 : sa === null ? 1 : -1;
      return sb.getTime() - sa.getTime();
    });

  return {
    bookings: state.list,
    loading: state.loading,
    /** Mensaje para el usuario si la carga falló. */
    error: state.error,
    upcoming,
    history,
    load,
    refresh,
    ...actions,
  };
}

export type BookingsViewModel = ReturnType<typeof useBookingsViewModel>;
