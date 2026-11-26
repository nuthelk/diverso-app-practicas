import { useCallback, useMemo, useRef, useState } from 'react';

import {
  CatalogSort,
  type CatalogRepository,
  type ExperienceCategory,
  type Plan,
  type Public,
} from '@/core';
import { MAX_COMPARE } from '@/router';

export { MAX_COMPARE };

interface CatalogState {
  plans: readonly Plan[];
  destinations: readonly string[];
  loading: boolean;
  /** Mensaje para el usuario si la última carga falló. */
  error: string | null;
  /** Detalle técnico del último error (para soporte). */
  errorDetails: string | null;
  text: string;
  category: ExperienceCategory | null;
  destination: string | null;
  maxPrice: number | null;
  date: Date | null;
  sort: CatalogSort;
  /** Ids elegidos para comparar (máx. [MAX_COMPARE]), en el orden en que se eligieron. */
  compareIds: readonly string[];
}

const initialState: CatalogState = {
  plans: [],
  destinations: [],
  loading: true,
  error: null,
  errorDetails: null,
  text: '',
  category: null,
  destination: null,
  maxPrice: null,
  date: null,
  sort: CatalogSort.rating,
  compareIds: [],
};

/**
 * ViewModel del catálogo (`CatalogViewModel`): filtros, resultados y selección para comparar.
 *
 * - Escribir NO busca (`setText` solo guarda); busca al enviar (`search`) o al borrar.
 * - `applyFilters` fija destino, precio y fecha con UNA consulta.
 * - `search` y `destinations` se piden en serie: si falla cualquiera, falla la carga (y se conserva
 *   lo anterior).
 * - La selección para comparar se purga de los planes que ya no aparecen; el 4.º se ignora.
 *
 * Igual que en los demás view models, el estado vive en `useState` + un ref espejo que leen los
 * comandos (un comando lanzado desde un cierre viejo ve el estado actual).
 */
export function useCatalogViewModel({ catalog }: { catalog: Pick<Public<CatalogRepository>, 'search' | 'destinations'> }) {
  const [state, setState] = useState<CatalogState>(initialState);
  const latest = useRef<CatalogState>(initialState);

  const update = useCallback((changes: Partial<CatalogState>) => {
    latest.current = { ...latest.current, ...changes };
    setState(latest.current);
  }, []);

  const load = useCallback(async (): Promise<void> => {
    update({ loading: true, error: null, errorDetails: null });
    const e = latest.current;
    try {
      const results = await catalog.search({
        text: e.text,
        category: e.category,
        destination: e.destination,
        maxPrice: e.maxPrice,
        date: e.date,
        sort: e.sort,
      });
      const destinations = await catalog.destinations();
      // La selección puede referenciar planes que ya no aparecen.
      const compareIds = latest.current.compareIds.filter((id) => results.some((p) => p.id === id));
      update({ plans: Object.freeze([...results]), destinations: Object.freeze([...destinations]), compareIds });
    } catch (error) {
      console.warn('CatalogViewModel.load:', error);
      update({
        error: 'No pudimos cargar los planes. Revisa tu conexión e intenta de nuevo.',
        errorDetails: String(error),
      });
    } finally {
      update({ loading: false });
    }
  }, [catalog, update]);

  const setText = useCallback((text: string) => update({ text }), [update]);

  const updateAndLoad = useCallback(
    (changes: Partial<CatalogState>) => {
      update(changes);
      return load();
    },
    [update, load],
  );

  const toggleCategory = useCallback(
    (c: ExperienceCategory | null) => updateAndLoad({ category: c === latest.current.category ? null : c }),
    [updateAndLoad],
  );

  const applyFilters = useCallback(
    ({ destination = null, maxPrice = null, date = null }: { destination?: string | null; maxPrice?: number | null; date?: Date | null } = {}) =>
      updateAndLoad({ destination, maxPrice, date }),
    [updateAndLoad],
  );

  const toggleCompare = useCallback(
    (p: Plan) => {
      const ids = latest.current.compareIds;
      if (ids.includes(p.id)) update({ compareIds: ids.filter((id) => id !== p.id) });
      else if (ids.length < MAX_COMPARE) update({ compareIds: [...ids, p.id] });
    },
    [update],
  );

  const selection = useMemo(
    () => state.plans.filter((p) => state.compareIds.includes(p.id)),
    [state.plans, state.compareIds],
  );

  return {
    plans: state.plans,
    destinations: state.destinations,
    loading: state.loading,
    error: state.error,
    errorDetails: state.errorDetails,
    text: state.text,
    category: state.category,
    destination: state.destination,
    maxPrice: state.maxPrice,
    date: state.date,
    sort: state.sort,
    /** Los planes elegidos para comparar, en el orden de `plans`. */
    selection,
    isComparing: (p: Plan) => state.compareIds.includes(p.id),
    /** Filtros de la hoja activos (destino, precio, fecha); categoría y texto no cuentan. */
    activeFilterCount: (state.destination !== null ? 1 : 0) + (state.maxPrice !== null ? 1 : 0) + (state.date !== null ? 1 : 0),
    load,
    setText,
    /** Al enviar el teclado. */
    search: load,
    toggleCategory,
    setDestination: (destination: string | null) => updateAndLoad({ destination }),
    setMaxPrice: (maxPrice: number | null) => updateAndLoad({ maxPrice }),
    setDate: (date: Date | null) => updateAndLoad({ date }),
    applyFilters,
    clearFilters: () => applyFilters(),
    setSort: (sort: CatalogSort) => updateAndLoad({ sort }),
    toggleCompare,
    clearCompare: () => update({ compareIds: [] }),
  };
}

export type CatalogViewModel = ReturnType<typeof useCatalogViewModel>;
