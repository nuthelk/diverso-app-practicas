import { useEffect, useState } from 'react';
import { mensajeError } from '@/shared/api/errores';
import { liquidacionDetalle } from '../api/liquidaciones.api';
import type { LiquidacionDetalle } from '../model/liquidaciones';

/** Una liquidación con sus reservas. Se vuelve a pedir si cambia el `id` (la respuesta del id anterior se ignora). */
export function useLiquidacionDetalle(id: string) {
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [liq, setLiq] = useState<LiquidacionDetalle | null>(null);

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    setError('');
    liquidacionDetalle(id)
      .then((l) => vigente && setLiq(l))
      .catch((e) => vigente && setError(mensajeError(e)))
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [id]);

  return { cargando, error, liq };
}
