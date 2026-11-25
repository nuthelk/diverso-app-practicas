import { useCallback, useMemo, useRef, useState } from 'react';

import {
  CatalogSort,
  type CatalogRepository,
  type ExperienceCategory,
  type Plan,
  type Public,
} from '@/core';
import { MAX_COMPARAR } from '@/router';

export { MAX_COMPARAR };

interface EstadoCatalogo {
  planes: readonly Plan[];
  destinos: readonly string[];
  cargando: boolean;
  /** Mensaje para el usuario si la última carga falló. */
  error: string | null;
  /** Detalle técnico del último error (para soporte). */
  errorDetalle: string | null;
  texto: string;
  categoria: ExperienceCategory | null;
  destino: string | null;
  precioMax: number | null;
  fecha: Date | null;
  orden: CatalogSort;
  /** Ids elegidos para comparar (máx. [MAX_COMPARAR]), en el orden en que se eligieron. */
  idsComparar: readonly string[];
}

const inicial: EstadoCatalogo = {
  planes: [],
  destinos: [],
  cargando: true,
  error: null,
  errorDetalle: null,
  texto: '',
  categoria: null,
  destino: null,
  precioMax: null,
  fecha: null,
  orden: CatalogSort.rating,
  idsComparar: [],
};

/**
 * ViewModel del catálogo (`CatalogViewModel`): filtros, resultados y selección para comparar.
 *
 * - Escribir NO busca (`setTexto` solo guarda); busca al enviar (`buscar`) o al borrar.
 * - `aplicarFiltros` fija destino, precio y fecha con UNA consulta.
 * - `search` y `destinos` se piden en serie: si falla cualquiera, falla la carga (y se conserva
 *   lo anterior).
 * - La selección para comparar se purga de los planes que ya no aparecen; el 4.º se ignora.
 *
 * Igual que en los demás view models, el estado vive en `useState` + un ref espejo que leen los
 * comandos (un comando lanzado desde un cierre viejo ve el estado actual).
 */
export function useCatalogViewModel({ catalogo }: { catalogo: Pick<Public<CatalogRepository>, 'search' | 'destinos'> }) {
  const [estado, setEstado] = useState<EstadoCatalogo>(inicial);
  const actual = useRef<EstadoCatalogo>(inicial);

  const cambiar = useCallback((cambios: Partial<EstadoCatalogo>) => {
    actual.current = { ...actual.current, ...cambios };
    setEstado(actual.current);
  }, []);

  const cargar = useCallback(async (): Promise<void> => {
    cambiar({ cargando: true, error: null, errorDetalle: null });
    const e = actual.current;
    try {
      const resultados = await catalogo.search({
        text: e.texto,
        category: e.categoria,
        destination: e.destino,
        maxPrice: e.precioMax,
        date: e.fecha,
        sort: e.orden,
      });
      const destinos = await catalogo.destinos();
      // La selección puede referenciar planes que ya no aparecen.
      const idsComparar = actual.current.idsComparar.filter((id) => resultados.some((p) => p.id === id));
      cambiar({ planes: Object.freeze([...resultados]), destinos: Object.freeze([...destinos]), idsComparar });
    } catch (error) {
      console.warn('CatalogViewModel.cargar:', error);
      cambiar({
        error: 'No pudimos cargar los planes. Revisa tu conexión e intenta de nuevo.',
        errorDetalle: String(error),
      });
    } finally {
      cambiar({ cargando: false });
    }
  }, [catalogo, cambiar]);

  const setTexto = useCallback((texto: string) => cambiar({ texto }), [cambiar]);

  const conFiltros = useCallback(
    (cambios: Partial<EstadoCatalogo>) => {
      cambiar(cambios);
      return cargar();
    },
    [cambiar, cargar],
  );

  const toggleCategoria = useCallback(
    (c: ExperienceCategory | null) => conFiltros({ categoria: c === actual.current.categoria ? null : c }),
    [conFiltros],
  );

  const aplicarFiltros = useCallback(
    ({ destino = null, precioMax = null, fecha = null }: { destino?: string | null; precioMax?: number | null; fecha?: Date | null } = {}) =>
      conFiltros({ destino, precioMax, fecha }),
    [conFiltros],
  );

  const toggleComparar = useCallback(
    (p: Plan) => {
      const ids = actual.current.idsComparar;
      if (ids.includes(p.id)) cambiar({ idsComparar: ids.filter((id) => id !== p.id) });
      else if (ids.length < MAX_COMPARAR) cambiar({ idsComparar: [...ids, p.id] });
    },
    [cambiar],
  );

  const seleccion = useMemo(
    () => estado.planes.filter((p) => estado.idsComparar.includes(p.id)),
    [estado.planes, estado.idsComparar],
  );

  return {
    planes: estado.planes,
    destinos: estado.destinos,
    cargando: estado.cargando,
    error: estado.error,
    errorDetalle: estado.errorDetalle,
    texto: estado.texto,
    categoria: estado.categoria,
    destino: estado.destino,
    precioMax: estado.precioMax,
    fecha: estado.fecha,
    orden: estado.orden,
    /** Los planes elegidos para comparar, en el orden de `planes`. */
    seleccion,
    comparando: (p: Plan) => estado.idsComparar.includes(p.id),
    /** Filtros de la hoja activos (destino, precio, fecha); categoría y texto no cuentan. */
    filtrosActivos: (estado.destino !== null ? 1 : 0) + (estado.precioMax !== null ? 1 : 0) + (estado.fecha !== null ? 1 : 0),
    cargar,
    setTexto,
    /** Al enviar el teclado. */
    buscar: cargar,
    toggleCategoria,
    setDestino: (destino: string | null) => conFiltros({ destino }),
    setPrecioMax: (precioMax: number | null) => conFiltros({ precioMax }),
    setFecha: (fecha: Date | null) => conFiltros({ fecha }),
    aplicarFiltros,
    limpiarFiltros: () => aplicarFiltros(),
    cambiarOrden: (orden: CatalogSort) => conFiltros({ orden }),
    toggleComparar,
    limpiarComparar: () => cambiar({ idsComparar: [] }),
  };
}

export type CatalogViewModel = ReturnType<typeof useCatalogViewModel>;
