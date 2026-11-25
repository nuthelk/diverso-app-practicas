import { useCallback, useEffect, useRef, useState } from 'react';
import { miAgencia } from '@/features/agencias/api/agencias.api';
import { mensajeError } from '@/shared/api/errores';
import type { Agency } from '@/features/agencias/model/agencia';
import { misLiquidaciones, cuentasResumen, serviciosPrestados } from '../api/liquidaciones.api';
import type { CuentaResumen, Liquidacion } from '../model/liquidaciones';

export interface DatosLiquidaciones {
  agencia: Agency | null;
  liquidaciones: Liquidacion[];
  cuenta: CuentaResumen | null;
  /** Servicios prestados (null si no se pudieron contar: la página simplemente no explica el anticipo). */
  servicios: number | null;
}

const SIN_DATOS: DatosLiquidaciones = { agencia: null, liquidaciones: [], cuenta: null, servicios: null };

/** Las liquidaciones de la agencia, su cuenta para dispersiones (resumida) y cuántos servicios lleva prestados. */
export function useLiquidaciones() {
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [datos, setDatos] = useState<DatosLiquidaciones>(SIN_DATOS);

  // Solo la última carga escribe: una respuesta vieja (o llegada tras desmontar) se ignora.
  const ultimaCarga = useRef(0);
  const montado = useRef(true);

  const cargar = useCallback(async () => {
    const esta = ++ultimaCarga.current;
    const vigente = () => montado.current && esta === ultimaCarga.current;
    setCargando(true);
    setError('');
    try {
      const agencia = await miAgencia();
      if (!vigente()) return;
      if (agencia) {
        const [liqs, cuentas, prestados] = await Promise.all([
          misLiquidaciones(agencia.id),
          cuentasResumen(),
          serviciosPrestados(agencia.id).catch(() => null),
        ]);
        if (!vigente()) return;
        setDatos({
          agencia,
          liquidaciones: liqs,
          cuenta: cuentas.find((c) => c.agency_id === agencia.id) ?? null,
          servicios: prestados,
        });
      } else {
        setDatos((previos) => ({ ...previos, agencia: null }));
      }
    } catch (e) {
      if (vigente()) setError(mensajeError(e));
    } finally {
      if (vigente()) setCargando(false);
    }
  }, []);

  useEffect(() => {
    montado.current = true;
    cargar();
    return () => {
      montado.current = false;
    };
  }, [cargar]);

  return { cargando, error, datos, recargar: cargar };
}
