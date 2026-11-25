import { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/model/auth';
import { miAgencia } from '../api/agencias.api';
import { useCambiosAgencia } from '../model/cambios-agencia';
import type { Agency } from '../model/agencia';

/**
 * La agencia que muestra el marco (nombre, logo y estado en el menú de cuenta, y el aviso de verificación).
 * Se vuelve a leer al navegar (`path`: cambios de verificación sin F5) y cuando una página avisa que la cambió (el logo
 * del perfil). Sin agencia el marco sigue funcionando; cada página muestra su propio error de carga.
 */
export function useAgenciaDelMarco(path: string): Agency | null {
  const { userId } = useAuth();
  const { version } = useCambiosAgencia();
  const [agencia, setAgencia] = useState<Agency | null>(null);

  useEffect(() => {
    if (!userId) return;
    // Las lecturas se pueden cruzar (navegar mientras cambia el logo): solo cuenta la última pedida. Lo decide la
    // bandera `vigente`, que apaga la limpieza del efecto anterior.
    let vigente = true;
    miAgencia()
      .then((a) => {
        if (vigente) setAgencia(a);
      })
      .catch(() => {});
    return () => {
      vigente = false;
    };
  }, [userId, path, version]);

  return agencia;
}
