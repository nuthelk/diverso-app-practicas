import { useNavigate } from 'react-router';
import { signOut } from '../model/auth';

/**
 * Cerrar sesión desde la interfaz: cierra la sesión en Supabase y lleva a /login.
 *
 * `signOut()` solo cierra la sesión: el modelo no conoce el router, así que la navegación vive en
 * este hook. Hace falta además del guard del layout raíz porque /starter es una ruta pública: quien cierra sesión desde
 * el Starter (cuando no se pudo abrir el panel) no sería redirigido por el guard y quedaría en una pantalla muerta.
 */
export function useCerrarSesion(): () => Promise<void> {
  const navegar = useNavigate();
  return async () => {
    await signOut();
    navegar('/login');
  };
}
