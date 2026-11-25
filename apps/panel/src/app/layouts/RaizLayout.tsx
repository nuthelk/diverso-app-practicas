import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { useAuth } from '@/features/auth/model/auth';
import { redireccionSesion } from '@/features/auth/model/sesion';
import { iniciarTema } from '@/shared/lib/tema';
import Toast from '@/shared/ui/Toast';
import DialogoConfirmar from '@/shared/ui/DialogoConfirmar';
import Spinner from '@/shared/ui/Spinner';
import AnunciadorRuta from '../AnunciadorRuta';

/**
 * Layout raíz: envuelve TODAS las rutas, también login, admin y la página de error.
 * Arranca el tema, aplica el guard de sesión, muestra un spinner mientras Supabase dice si hay sesión, y monta una
 * sola vez el Toast, el diálogo de confirmación globales y el anunciador de rutas para lectores de pantalla (el que
 * SvelteKit traía de serie).
 */
export default function RaizLayout() {
  const { ready, userId } = useAuth();
  const { pathname } = useLocation();
  const navegar = useNavigate();

  // El tema (Sistema / Claro / Oscuro) vale para todo el panel, también login y admin. Se inicia una sola vez.
  useEffect(() => iniciarTema(), []);

  // Guard de sesión: la decisión vive en sesion.ts (sin sesión → /login; con sesión en /login → /starter).
  useEffect(() => {
    if (!ready) return;
    const destino = redireccionSesion(pathname, userId);
    if (destino) navegar(destino);
  }, [ready, userId, pathname, navegar]);

  return (
    <>
      {!ready ? <PantallaCargando /> : <Outlet />}

      <Toast />
      <DialogoConfirmar />
      <AnunciadorRuta />
    </>
  );
}

/** Spinner de pantalla completa: mientras se sabe si hay sesión (y mientras el router resuelve la primera ruta). */
export function PantallaCargando() {
  return (
    <div className="grid min-h-screen place-items-center" role="status" aria-label="Cargando">
      <Spinner />
    </div>
  );
}
