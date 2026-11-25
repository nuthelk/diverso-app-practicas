import { useCallback, useRef, useState } from 'react';

import { sortAgencies, AgencySort, type AgencySummary, type CatalogRepository, type Public } from '@/core';

interface AgenciesState {
  /** Tal como llegaron del servidor. */
  raw: readonly AgencySummary[];
  /** En el orden elegido (solo lectura). */
  agencies: readonly AgencySummary[];
  loading: boolean;
  error: string | null;
  errorDetails: string | null;
  sort: AgencySort;
}

const initialState: AgenciesState = {
  raw: [],
  agencies: [],
  loading: true,
  error: null,
  errorDetails: null,
  sort: AgencySort.score,
};

const sortedAgencies = (agencies: readonly AgencySummary[], sort: AgencySort) => Object.freeze(sortAgencies(agencies, sort));

/**
 * ViewModel de la pestaña «Agencias» (`AgenciasViewModel`): la lista pública de agencias y su
 * orden (por puntaje por defecto). Cambiar el orden reordena en memoria, sin volver a consultar;
 * una recarga que falla conserva lo que ya se veía.
 */
export function useAgenciesViewModel({ catalog }: { catalog: Pick<Public<CatalogRepository>, 'agencies'> }) {
  const [state, setState] = useState<AgenciesState>(initialState);
  const latest = useRef<AgenciesState>(initialState);
  const update = useCallback((changes: Partial<AgenciesState>) => {
    latest.current = { ...latest.current, ...changes };
    setState(latest.current);
  }, []);

  const load = useCallback(async (): Promise<void> => {
    update({ loading: true, error: null, errorDetails: null });
    try {
      const raw = await catalog.agencies();
      update({ raw, agencies: sortedAgencies(raw, latest.current.sort) });
    } catch (e) {
      console.warn('AgenciesViewModel.load:', e);
      update({
        error: 'No pudimos cargar las agencias. Revisa tu conexión e intenta de nuevo.',
        errorDetails: String(e),
      });
    } finally {
      update({ loading: false });
    }
  }, [catalog, update]);

  const setSort = useCallback(
    (nextSort: AgencySort) => {
      if (nextSort === latest.current.sort) return;
      update({ sort: nextSort, agencies: sortedAgencies(latest.current.raw, nextSort) });
    },
    [update],
  );

  return {
    agencies: state.agencies,
    hasAgencies: state.raw.length > 0,
    loading: state.loading,
    /** Mensaje para el usuario si la última carga falló. */
    error: state.error,
    /** Detalle técnico del último error (para soporte). */
    errorDetails: state.errorDetails,
    sort: state.sort,
    load,
    setSort,
  };
}
