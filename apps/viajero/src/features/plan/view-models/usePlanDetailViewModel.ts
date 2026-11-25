import { useCallback, useRef, useState } from 'react';

import type { CatalogRepository, Plan, PlanDate, Public, Review, ReviewRepository } from '@/core';

/** Cuántas reseñas se muestran en la ficha (no hay «ver todas»). */
export const MAX_RESENAS = 4;

interface EstadoFicha {
  plan: Plan | null;
  resenas: readonly Review[];
  cargando: boolean;
  error: string | null;
  fechaId: string | null;
}

const inicial: EstadoFicha = { plan: null, resenas: [], cargando: true, error: null, fechaId: null };

/**
 * ViewModel de la ficha del plan (`PlanDetailViewModel`): carga el plan y sus 4 reseñas más
 * recientes EN SERIE (si fallan las reseñas, falla toda la ficha: comportamiento preservado,
 * gotcha 13) y guarda la fecha elegida en la barra de reserva.
 *
 * `fechas` y `fechaSeleccionada` dependen del reloj (una salida que ya partió deja de ofrecerse):
 * se derivan en cada render, nunca se guardan (gotcha 10). [reloj] se inyecta en pruebas.
 */
export function usePlanDetailViewModel({
  catalogo,
  resenas,
  planId,
  reloj = () => new Date(),
}: {
  catalogo: Pick<Public<CatalogRepository>, 'planDetalle'>;
  resenas: Pick<Public<ReviewRepository>, 'porPlan'>;
  planId: string;
  reloj?: () => Date;
}) {
  const [estado, setEstado] = useState<EstadoFicha>(inicial);
  const actual = useRef<EstadoFicha>(inicial);
  const cambiar = useCallback((cambios: Partial<EstadoFicha>) => {
    actual.current = { ...actual.current, ...cambios };
    setEstado(actual.current);
  }, []);

  const cargar = useCallback(async (): Promise<void> => {
    cambiar({ cargando: true, error: null, fechaId: null });
    try {
      const plan = await catalogo.planDetalle(planId);
      const lista = await resenas.porPlan(planId, { limit: MAX_RESENAS });
      cambiar({ plan, resenas: Object.freeze([...lista]) });
    } catch (e) {
      console.warn('PlanDetailViewModel.cargar:', e);
      cambiar({ error: 'Revisa tu conexión e intenta de nuevo.' });
    } finally {
      cambiar({ cargando: false });
    }
  }, [catalogo, resenas, planId, cambiar]);

  /** Próximas fechas reservables, de la más cercana a la más lejana (según el reloj). */
  const fechas: readonly PlanDate[] = estado.plan?.availableDatesAt(reloj()) ?? [];
  /** La elegida si sigue disponible; si no, la más cercana; null sin fechas. */
  const fechaSeleccionada: PlanDate | null =
    fechas.length === 0 ? null : (fechas.find((f) => f.id === estado.fechaId) ?? fechas[0]!);

  const seleccionarFecha = (fecha: PlanDate) => {
    const disponibles = actual.current.plan?.availableDatesAt(reloj()) ?? [];
    if (!disponibles.some((f) => f.id === fecha.id)) return;
    cambiar({ fechaId: fecha.id });
  };

  return {
    plan: estado.plan,
    resenas: estado.resenas,
    cargando: estado.cargando,
    /** Mensaje para el usuario si la carga falló. */
    error: estado.error,
    fechas,
    fechaSeleccionada,
    cargar,
    seleccionarFecha,
  };
}
