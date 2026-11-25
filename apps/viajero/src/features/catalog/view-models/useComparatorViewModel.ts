import { useCallback, useEffect, useRef, useState } from 'react';

import type { CatalogRepository, Plan, Publico } from '@/core';

/** `listEquals` de los ids: mismos ids y en el mismo orden. */
function mismosIds(planes: readonly Plan[], ids: readonly string[]): boolean {
  return planes.length === ids.length && planes.every((p, i) => p.id === ids[i]);
}

function planesDeArranque(ids: readonly string[], planesIniciales?: readonly Plan[] | null): readonly Plan[] | null {
  if (planesIniciales && mismosIds(planesIniciales, ids)) return planesIniciales;
  if (ids.length === 0) return [];
  return null;
}

/**
 * ViewModel del comparador (`ComparatorViewModel`): carga los planes por sus ids
 * (`/comparar?ids=a,b`), así la pantalla se reconstruye igual tras recargar en web.
 * [planesIniciales] (los que el catálogo ya tenía, el `extra` de go_router) solo se usan si son
 * EXACTAMENTE los de [ids], en el mismo orden (gotcha 5).
 */
export function useComparatorViewModel({
  catalogo,
  ids,
  planesIniciales,
}: {
  catalogo: Pick<Publico<CatalogRepository>, 'planDetalle'>;
  ids: readonly string[];
  planesIniciales?: readonly Plan[] | null;
}) {
  const [planes, setPlanesEstado] = useState<readonly Plan[] | null>(() => planesDeArranque(ids, planesIniciales));
  const [error, setErrorEstado] = useState<string | null>(null);
  const planesRef = useRef(planes);
  const montado = useRef(true);
  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  const cargar = useCallback(async (): Promise<void> => {
    if (planesRef.current !== null) return;
    setErrorEstado(null);
    try {
      const cargados = await Promise.all(ids.map((id) => catalogo.planDetalle(id)));
      if (!montado.current) return;
      planesRef.current = cargados;
      setPlanesEstado(cargados);
    } catch (e) {
      if (!montado.current) return;
      console.warn('ComparatorViewModel.cargar:', e);
      setErrorEstado('No pudimos cargar los planes. Revisa tu conexión e intenta de nuevo.');
    }
  }, [catalogo, ids]);

  return {
    /** Los planes a comparar, en el orden de los ids; null mientras se cargan o si falló. */
    planes,
    cargando: planes === null && error === null,
    /** Mensaje para el usuario si no se pudieron cargar los planes. */
    error,
    cargar,
  };
}
