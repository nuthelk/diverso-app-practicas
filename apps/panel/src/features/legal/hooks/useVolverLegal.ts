import { useNavigate } from 'react-router';
import { useAuth } from '@/features/auth/model/auth';
import { destinoVolver } from '../model/volver';

/**
 * «Volver» de un documento legal: atrás si la pestaña tiene historial; si se abrió en una pestaña nueva, al resumen con
 * sesión o a iniciar sesión sin ella (la regla vive en `destinoVolver`).
 */
export function useVolverLegal(): () => void {
  const { userId } = useAuth();
  const navegar = useNavigate();
  return () => {
    const destino = destinoVolver(history.length, !!userId);
    if (destino === 'atras') history.back();
    else navegar(destino);
  };
}
