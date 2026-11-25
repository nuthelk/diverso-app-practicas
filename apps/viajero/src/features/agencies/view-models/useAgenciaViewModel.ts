import { useCallback, useRef, useState } from 'react';

import type { AgencySummary, CatalogRepository, Plan, Public } from '@/core';

interface EstadoAgencia {
  agencia: AgencySummary | null;
  planes: readonly Plan[];
  cargando: boolean;
  noEncontrada: boolean;
  error: string | null;
  errorDetalle: string | null;
}

const inicial: EstadoAgencia = {
  agencia: null,
  planes: [],
  cargando: true,
  noEncontrada: false,
  error: null,
  errorDetalle: null,
};

/**
 * ViewModel de la página de una agencia (`AgenciaViewModel`): su resumen público y sus planes
 * publicados, por id (sobrevive a una recarga en web). «No encontrada» no distingue a propósito
 * entre «no existe» y «no habilitada». Una recarga que falla conserva lo ya cargado.
 */
export function useAgenciaViewModel({
  catalogo,
  agencyId,
}: {
  catalogo: Pick<Public<CatalogRepository>, 'agencyWithPlans'>;
  agencyId: string;
}) {
  const [estado, setEstado] = useState<EstadoAgencia>(inicial);
  const actual = useRef<EstadoAgencia>(inicial);
  const cambiar = useCallback((cambios: Partial<EstadoAgencia>) => {
    actual.current = { ...actual.current, ...cambios };
    setEstado(actual.current);
  }, []);

  const cargar = useCallback(async (): Promise<void> => {
    cambiar({ cargando: true, error: null, errorDetalle: null });
    try {
      const r = await catalogo.agencyWithPlans(agencyId);
      cambiar({ noEncontrada: r === null, agencia: r?.agency ?? null, planes: Object.freeze([...(r?.plans ?? [])]) });
    } catch (e) {
      console.warn('AgenciaViewModel.cargar:', e);
      cambiar({
        error: 'No pudimos cargar la agencia. Revisa tu conexión e intenta de nuevo.',
        errorDetalle: String(e),
      });
    } finally {
      cambiar({ cargando: false });
    }
  }, [catalogo, agencyId, cambiar]);

  return { ...estado, cargar };
}
