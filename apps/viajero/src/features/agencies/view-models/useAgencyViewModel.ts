import { useCallback, useRef, useState } from 'react';

import type { AgencySummary, CatalogRepository, Plan, Public } from '@/core';

interface AgencyState {
  agency: AgencySummary | null;
  plans: readonly Plan[];
  loading: boolean;
  notFound: boolean;
  error: string | null;
  errorDetails: string | null;
}

const initialState: AgencyState = {
  agency: null,
  plans: [],
  loading: true,
  notFound: false,
  error: null,
  errorDetails: null,
};

/**
 * ViewModel de la página de una agencia (`AgenciaViewModel`): su resumen público y sus planes
 * publicados, por id (sobrevive a una recarga en web). «No encontrada» no distingue a propósito
 * entre «no existe» y «no habilitada». Una recarga que falla conserva lo ya cargado.
 */
export function useAgencyViewModel({
  catalog,
  agencyId,
}: {
  catalog: Pick<Public<CatalogRepository>, 'agencyWithPlans'>;
  agencyId: string;
}) {
  const [state, setState] = useState<AgencyState>(initialState);
  const latest = useRef<AgencyState>(initialState);
  const update = useCallback((changes: Partial<AgencyState>) => {
    latest.current = { ...latest.current, ...changes };
    setState(latest.current);
  }, []);

  const load = useCallback(async (): Promise<void> => {
    update({ loading: true, error: null, errorDetails: null });
    try {
      const r = await catalog.agencyWithPlans(agencyId);
      update({ notFound: r === null, agency: r?.agency ?? null, plans: Object.freeze([...(r?.plans ?? [])]) });
    } catch (e) {
      console.warn('AgencyViewModel.load:', e);
      update({
        error: 'No pudimos cargar la agencia. Revisa tu conexión e intenta de nuevo.',
        errorDetails: String(e),
      });
    } finally {
      update({ loading: false });
    }
  }, [catalog, agencyId, update]);

  return { ...state, load };
}
