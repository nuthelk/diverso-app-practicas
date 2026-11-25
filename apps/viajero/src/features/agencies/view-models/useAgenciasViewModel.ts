import { useCallback, useRef, useState } from 'react';

import { ordenarAgencias, OrdenAgencias, type AgenciaResumen, type CatalogRepository, type Publico } from '@/core';

interface EstadoAgencias {
  /** Tal como llegaron del servidor. */
  crudas: readonly AgenciaResumen[];
  /** En el orden elegido (solo lectura). */
  agencias: readonly AgenciaResumen[];
  cargando: boolean;
  error: string | null;
  errorDetalle: string | null;
  orden: OrdenAgencias;
}

const inicial: EstadoAgencias = {
  crudas: [],
  agencias: [],
  cargando: true,
  error: null,
  errorDetalle: null,
  orden: OrdenAgencias.puntaje,
};

const ordenar = (agencias: readonly AgenciaResumen[], orden: OrdenAgencias) => Object.freeze(ordenarAgencias(agencias, orden));

/**
 * ViewModel de la pestaña «Agencias» (`AgenciasViewModel`): la lista pública de agencias y su
 * orden (por puntaje por defecto). Cambiar el orden reordena en memoria, sin volver a consultar;
 * una recarga que falla conserva lo que ya se veía.
 */
export function useAgenciasViewModel({ catalogo }: { catalogo: Pick<Publico<CatalogRepository>, 'agencias'> }) {
  const [estado, setEstado] = useState<EstadoAgencias>(inicial);
  const actual = useRef<EstadoAgencias>(inicial);
  const cambiar = useCallback((cambios: Partial<EstadoAgencias>) => {
    actual.current = { ...actual.current, ...cambios };
    setEstado(actual.current);
  }, []);

  const cargar = useCallback(async (): Promise<void> => {
    cambiar({ cargando: true, error: null, errorDetalle: null });
    try {
      const crudas = await catalogo.agencias();
      cambiar({ crudas, agencias: ordenar(crudas, actual.current.orden) });
    } catch (e) {
      console.warn('AgenciasViewModel.cargar:', e);
      cambiar({
        error: 'No pudimos cargar las agencias. Revisa tu conexión e intenta de nuevo.',
        errorDetalle: String(e),
      });
    } finally {
      cambiar({ cargando: false });
    }
  }, [catalogo, cambiar]);

  const cambiarOrden = useCallback(
    (nuevo: OrdenAgencias) => {
      if (nuevo === actual.current.orden) return;
      cambiar({ orden: nuevo, agencias: ordenar(actual.current.crudas, nuevo) });
    },
    [cambiar],
  );

  return {
    agencias: estado.agencias,
    hayAgencias: estado.crudas.length > 0,
    cargando: estado.cargando,
    /** Mensaje para el usuario si la última carga falló. */
    error: estado.error,
    /** Detalle técnico del último error (para soporte). */
    errorDetalle: estado.errorDetalle,
    orden: estado.orden,
    cargar,
    cambiarOrden,
  };
}
