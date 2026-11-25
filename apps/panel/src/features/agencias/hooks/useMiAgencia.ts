import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { mensajeError } from '@/shared/api/errores';
import { miAgencia } from '../api/agencias.api';
import type { Agency } from '../model/agencia';

/**
 * La agencia de la cuenta, cargada al montar. `setDatos` deja cambiar la copia en pantalla después de guardar (el logo
 * o los datos de contacto) sin volver a pedirla.
 */
export function useMiAgencia(): {
  cargando: boolean;
  error: string;
  datos: Agency | null;
  setDatos: Dispatch<SetStateAction<Agency | null>>;
  recargar: () => void;
} {
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [datos, setDatos] = useState<Agency | null>(null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    // Si el efecto se repite (Reintentar o el doble montaje de StrictMode) la respuesta vieja se ignora.
    let vigente = true;
    setCargando(true);
    setError('');
    miAgencia()
      .then((a) => {
        if (vigente) setDatos(a);
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

  return { cargando, error, datos, setDatos, recargar: () => setIntento((n) => n + 1) };
}
