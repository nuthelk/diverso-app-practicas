import { useCallback, useRef, useState } from 'react';

import type { CatalogRepository, Plan, PlanDate, Public, Review, ReviewRepository } from '@/core';

/** Cuántas reseñas se muestran en la ficha (no hay «ver todas»). */
export const MAX_REVIEWS = 4;

interface PlanDetailState {
  plan: Plan | null;
  reviews: readonly Review[];
  loading: boolean;
  error: string | null;
  dateId: string | null;
}

const initialState: PlanDetailState = { plan: null, reviews: [], loading: true, error: null, dateId: null };

/**
 * ViewModel de la ficha del plan (`PlanDetailViewModel`): carga el plan y sus 4 reseñas más
 * recientes EN SERIE (si fallan las reseñas, falla toda la ficha: comportamiento preservado,
 * gotcha 13) y guarda la fecha elegida en la barra de reserva.
 *
 * `dates` y `selectedDate` dependen del reloj (una salida que ya partió deja de ofrecerse):
 * se derivan en cada render, nunca se guardan (gotcha 10). [clock] se inyecta en pruebas.
 */
export function usePlanDetailViewModel({
  catalog,
  reviews,
  planId,
  clock = () => new Date(),
}: {
  catalog: Pick<Public<CatalogRepository>, 'planDetail'>;
  reviews: Pick<Public<ReviewRepository>, 'byPlan'>;
  planId: string;
  clock?: () => Date;
}) {
  const [state, setState] = useState<PlanDetailState>(initialState);
  const latest = useRef<PlanDetailState>(initialState);
  const update = useCallback((changes: Partial<PlanDetailState>) => {
    latest.current = { ...latest.current, ...changes };
    setState(latest.current);
  }, []);

  const load = useCallback(async (): Promise<void> => {
    update({ loading: true, error: null, dateId: null });
    try {
      const plan = await catalog.planDetail(planId);
      const list = await reviews.byPlan(planId, { limit: MAX_REVIEWS });
      update({ plan, reviews: Object.freeze([...list]) });
    } catch (e) {
      console.warn('PlanDetailViewModel.load:', e);
      update({ error: 'Revisa tu conexión e intenta de nuevo.' });
    } finally {
      update({ loading: false });
    }
  }, [catalog, reviews, planId, update]);

  /** Próximas fechas reservables, de la más cercana a la más lejana (según el reloj). */
  const dates: readonly PlanDate[] = state.plan?.availableDatesAt(clock()) ?? [];
  /** La elegida si sigue disponible; si no, la más cercana; null sin fechas. */
  const selectedDate: PlanDate | null =
    dates.length === 0 ? null : (dates.find((f) => f.id === state.dateId) ?? dates[0]!);

  const selectDate = (planDate: PlanDate) => {
    const available = latest.current.plan?.availableDatesAt(clock()) ?? [];
    if (!available.some((f) => f.id === planDate.id)) return;
    update({ dateId: planDate.id });
  };

  return {
    plan: state.plan,
    reviews: state.reviews,
    loading: state.loading,
    /** Mensaje para el usuario si la carga falló. */
    error: state.error,
    dates,
    selectedDate,
    load,
    selectDate,
  };
}
