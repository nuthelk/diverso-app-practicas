import { useCallback, useRef, useState } from 'react';
import { quienesVan } from '../api/resumen.api';
import { reservasPorFecha, type EstadoQuienes, type ReservaDeSalida } from '../model/quienes-van';

export type ReservasDeSalida = { estado: EstadoQuienes; reservas: ReservaDeSalida[] };

/**
 * «Quiénes van» de cada salida, pedido al abrir su fila. La tabla (`SalidasDelPeriodo`) es presentacional: el
 * contenedor (la página) le pasa el estado y la función que lo pide.
 * Solo vale la última petición de cada salida: si se cierra y se reabre, la respuesta vieja se descarta.
 */
export function useQuienesVan(): { quienes: Record<string, ReservasDeSalida>; cargarQuienes: (id: string) => void } {
  const [quienes, setQuienes] = useState<Record<string, ReservasDeSalida>>({});
  const peticiones = useRef<Record<string, number>>({});

  const cargarQuienes = useCallback(async (id: string) => {
    const mia = (peticiones.current[id] = (peticiones.current[id] ?? 0) + 1);
    setQuienes((q) => ({ ...q, [id]: { estado: 'cargando', reservas: [] } }));
    try {
      const filas = await quienesVan([id]);
      if (mia === peticiones.current[id]) setQuienes((q) => ({ ...q, [id]: { estado: 'ok', reservas: reservasPorFecha(filas).get(id) ?? [] } }));
    } catch {
      if (mia === peticiones.current[id]) setQuienes((q) => ({ ...q, [id]: { estado: 'error', reservas: [] } }));
    }
  }, []);

  return { quienes, cargarQuienes };
}
