import { useEffect, useState } from 'react';
import { mensajeError } from '@/shared/api/errores';
import { misVentas } from '../api/ventas.api';
import type { VentaRow } from '../model/ventas';

export interface DatosVentas {
  ventas: VentaRow[];
  /** La comisión de la agencia; sin agencia, la de por defecto (12 %). */
  comisionPct: number;
}

/** Las ventas de la agencia y su comisión, cargadas al montar. */
export function useVentas(): { cargando: boolean; error: string; datos: DatosVentas; recargar: () => void } {
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [datos, setDatos] = useState<DatosVentas>({ ventas: [], comisionPct: 12 });
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    // Si el efecto se repite (otro intento o el doble montaje de StrictMode) la respuesta vieja se ignora.
    let vigente = true;
    setCargando(true);
    setError('');
    misVentas()
      .then((r) => {
        if (vigente) setDatos({ ventas: r.ventas, comisionPct: r.agencia?.comision_pct ?? 12 });
      })
      .catch((e) => {
        if (vigente) setError(mensajeError(e));
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [intento]);

  return { cargando, error, datos, recargar: () => setIntento((n) => n + 1) };
}
