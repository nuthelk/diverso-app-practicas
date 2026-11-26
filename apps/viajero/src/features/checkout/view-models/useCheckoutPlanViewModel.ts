import type { CatalogRepository, Plan, PlanDate, Public } from '@/core';

import { useLiveState } from './use-live-state';

interface CheckoutPlanState {
  /** Null mientras se carga o si la carga falló. */
  plan: Plan | null;
  loading: boolean;
  /** Mensaje para el usuario si la carga falló. */
  error: string | null;
}

/**
 * ViewModel de la carga de `/checkout/:planId/:fechaId` (`CheckoutPlanViewModel`): trae el plan
 * por id (la pantalla se reconstruye igual tras recargar la página en web) y localiza la fecha
 * pedida. No carga solo: la vista llama a `load()` al montarse (como el `..cargar()` de Dart).
 */
export function useCheckoutPlanViewModel(
  { catalog }: { catalog: Pick<Public<CatalogRepository>, 'planDetail'> },
  { planId, dateId, clock = () => new Date() }: { planId: string; dateId: string; clock?: () => Date },
) {
  const { state, update } = useLiveState<CheckoutPlanState>(() => ({ plan: null, loading: true, error: null }));

  const load = async (): Promise<void> => {
    update({ loading: true, error: null });
    try {
      update({ plan: await catalog.planDetail(planId) }, false);
    } catch (e) {
      console.warn('CheckoutPlanViewModel.load:', e);
      update({ error: 'Revisa tu conexión e intenta de nuevo.' }, false);
    } finally {
      update({ loading: false });
    }
  };

  /**
   * La fecha pedida, si sigue reservable. Null con el plan cargado = la fecha ya no está
   * disponible (no existe en el plan o la salida ya partió); depende del reloj, así que se calcula
   * en cada lectura (en cada render), nunca se guarda.
   */
  const plan = state.plan;
  const now = clock();
  const planDate: PlanDate | null = plan?.dates.find((d) => d.id === dateId && !plan.hasDeparted(d, now)) ?? null;

  return { ...state, planDate, load };
}

export type CheckoutPlanViewModel = ReturnType<typeof useCheckoutPlanViewModel>;
