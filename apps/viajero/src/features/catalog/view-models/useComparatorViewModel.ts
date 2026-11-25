import { useCallback, useEffect, useRef, useState } from 'react';

import type { CatalogRepository, Plan, Public } from '@/core';

/** `listEquals` de los ids: mismos ids y en el mismo orden. */
function sameIds(plans: readonly Plan[], ids: readonly string[]): boolean {
  return plans.length === ids.length && plans.every((p, i) => p.id === ids[i]);
}

function startingPlans(ids: readonly string[], initialPlans?: readonly Plan[] | null): readonly Plan[] | null {
  if (initialPlans && sameIds(initialPlans, ids)) return initialPlans;
  if (ids.length === 0) return [];
  return null;
}

/**
 * ViewModel del comparador (`ComparatorViewModel`): carga los planes por sus ids
 * (`/comparar?ids=a,b`), así la pantalla se reconstruye igual tras recargar en web.
 * [initialPlans] (los que el catálogo ya tenía, el `extra` de go_router) solo se usan si son
 * EXACTAMENTE los de [ids], en el mismo orden (gotcha 5).
 */
export function useComparatorViewModel({
  catalog,
  ids,
  initialPlans,
}: {
  catalog: Pick<Public<CatalogRepository>, 'planDetail'>;
  ids: readonly string[];
  initialPlans?: readonly Plan[] | null;
}) {
  const [plans, setPlans] = useState<readonly Plan[] | null>(() => startingPlans(ids, initialPlans));
  const [error, setError] = useState<string | null>(null);
  const plansRef = useRef(plans);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async (): Promise<void> => {
    if (plansRef.current !== null) return;
    setError(null);
    try {
      const loaded = await Promise.all(ids.map((id) => catalog.planDetail(id)));
      if (!mounted.current) return;
      plansRef.current = loaded;
      setPlans(loaded);
    } catch (e) {
      if (!mounted.current) return;
      console.warn('ComparatorViewModel.load:', e);
      setError('No pudimos cargar los planes. Revisa tu conexión e intenta de nuevo.');
    }
  }, [catalog, ids]);

  return {
    /** Los planes a comparar, en el orden de los ids; null mientras se cargan o si falló. */
    plans,
    loading: plans === null && error === null,
    /** Mensaje para el usuario si no se pudieron cargar los planes. */
    error,
    load,
  };
}
