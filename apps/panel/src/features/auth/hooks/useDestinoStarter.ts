import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { miAgencia } from '@/features/agencias/api/agencias.api';
import { consentimientosPendientes } from '@/features/legal/api/legal.api';
import { mensajeError } from '@/shared/api/errores';
import { perfilActual, useAuth } from '../model/auth';

/**
 * Decide a dónde va quien acaba de entrar: admin → /admin; agencia sin registro → /onboarding (el registro incluye la
 * autorización); con consentimientos pendientes → /consentimiento; si no, al resumen.
 * Si no se puede decidir devuelve el `fallo` (texto legible) y `reintentar` para volver a probar.
 */
export function useDestinoStarter(): { fallo: string; reintentar: () => void } {
  const { ready, userId } = useAuth();
  const navegar = useNavigate();
  const [fallo, setFallo] = useState('');
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    if (!ready || !userId) return;
    // Si el efecto se repite (otro intento, otra sesión o el doble montaje de StrictMode) la respuesta vieja se ignora.
    let vigente = true;
    setFallo('');
    (async () => {
      try {
        const perfil = await perfilActual();
        if (!vigente) return;
        if (perfil.rol === 'admin') return navegar('/admin');
        const agencia = await miAgencia();
        if (!vigente) return;
        if (!agencia) return navegar('/onboarding');
        const pendientes = await consentimientosPendientes();
        if (!vigente) return;
        navegar(pendientes.length > 0 ? '/consentimiento' : '/dashboard');
      } catch (e) {
        // Mandar a /login con sesión abierta rebota otra vez aquí: se avisa y se deja elegir.
        if (vigente) setFallo(mensajeError(e));
      }
    })();
    return () => {
      vigente = false;
    };
  }, [intento, ready, userId, navegar]);

  return { fallo, reintentar: () => setIntento((n) => n + 1) };
}
