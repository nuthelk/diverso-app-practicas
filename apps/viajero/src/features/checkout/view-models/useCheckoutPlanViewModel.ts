import type { CatalogRepository, Plan, PlanDate, Public } from '@/core';

import { useEstadoVivo } from './use-estado-vivo';

interface EstadoCheckoutPlan {
  /** Null mientras se carga o si la carga falló. */
  plan: Plan | null;
  cargando: boolean;
  /** Mensaje para el usuario si la carga falló. */
  error: string | null;
}

/**
 * ViewModel de la carga de `/checkout/:planId/:fechaId` (`CheckoutPlanViewModel`): trae el plan
 * por id (la pantalla se reconstruye igual tras recargar la página en web) y localiza la fecha
 * pedida. No carga solo: la vista llama a `cargar()` al montarse (como el `..cargar()` de Dart).
 */
export function useCheckoutPlanViewModel(
  { catalogo }: { catalogo: Pick<Public<CatalogRepository>, 'planDetalle'> },
  { planId, fechaId, reloj = () => new Date() }: { planId: string; fechaId: string; reloj?: () => Date },
) {
  const { estado, cambiar } = useEstadoVivo<EstadoCheckoutPlan>(() => ({ plan: null, cargando: true, error: null }));

  const cargar = async (): Promise<void> => {
    cambiar({ cargando: true, error: null });
    try {
      cambiar({ plan: await catalogo.planDetalle(planId) }, false);
    } catch (e) {
      console.warn('CheckoutPlanViewModel.cargar:', e);
      cambiar({ error: 'Revisa tu conexión e intenta de nuevo.' }, false);
    } finally {
      cambiar({ cargando: false });
    }
  };

  /**
   * La fecha pedida, si sigue reservable. Null con el plan cargado = la fecha ya no está
   * disponible (no existe en el plan o la salida ya partió); depende del reloj, así que se calcula
   * en cada lectura (en cada render), nunca se guarda.
   */
  const plan = estado.plan;
  const ahora = reloj();
  const fecha: PlanDate | null = plan?.dates.find((d) => d.id === fechaId && !plan.hasDeparted(d, ahora)) ?? null;

  return { ...estado, fecha, cargar };
}

export type CheckoutPlanViewModel = ReturnType<typeof useCheckoutPlanViewModel>;
