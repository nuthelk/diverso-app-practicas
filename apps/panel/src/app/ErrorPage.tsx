import { useMemo } from 'react';
import { isRouteErrorResponse, useRouteError } from 'react-router';
import { useAuth } from '@/features/auth/model/auth';
import { mensajeError } from '@/shared/api/errores';
import Logo from '@/shared/ui/Logo';
import { manejarError } from './manejarError';

/**
 * Página de error del router (su `errorElement`). Es el contenedor: lee el error de la ruta con
 * `useRouteError`, decide su estado HTTP (404 si la ruta no existe; 500 si algo falló al dibujar o cargar), lo registra
 * con `manejarError` y le pasa a `PantallaError` lo que hay que mostrar.
 */
export default function ErrorPage() {
  const error = useRouteError();
  const status = isRouteErrorResponse(error) ? error.status : 500;
  // Se registra una vez por error (no en cada dibujo). Una respuesta de error del router (p. ej. el 404) trae su texto
  // en `data` o en `statusText`; cualquier otro error se pasa tal cual.
  const pagina = useMemo(() => {
    const crudo = isRouteErrorResponse(error) ? (error.data ?? { message: error.statusText }) : error;
    return manejarError({ error: crudo, status });
  }, [error, status]);
  return <PantallaError status={status} error={pagina} />;
}

/** Lo que se ve: título, explicación legible y a dónde ir (con sesión, al resumen; sin sesión, a iniciar sesión). */
export function PantallaError({ status, error }: { status: number; error: { message: string } | null }) {
  const { userId } = useAuth();
  const noExiste = status === 404;
  const conSesion = !!userId;

  // Sin texto útil (o el «Internal Error» genérico) no se le dice nada a quien lo lee: se usa un mensaje general.
  const mensaje = (() => {
    if (noExiste) return 'La dirección no existe o cambió de lugar. Revisa que esté bien escrita o vuelve al inicio.';
    const crudo = error?.message;
    if (!crudo || crudo === 'Internal Error') return 'Ocurrió un error inesperado. Intenta de nuevo; si sigue pasando, vuelve al inicio.';
    return mensajeError(error);
  })();

  return (
    <main className="grid min-h-screen place-items-center px-6 py-12">
      <div className="aparecer flex max-w-md flex-col items-center text-center">
        <Logo size={40} clase="text-helecho" />
        <p className="etiqueta-seccion mt-5">Error {status}</p>
        <h1 className="mt-2 text-pagina text-balance">{noExiste ? 'No encontramos esta página' : 'Algo salió mal'}</h1>
        <p className="mt-3 text-cuerpo text-tinta-2">{mensaje}</p>
        <div className="mt-7 flex flex-wrap justify-center gap-2">
          {conSesion ? (
            <a className="btn btn-primario" href="#/dashboard">
              Ir al resumen
            </a>
          ) : (
            <a className="btn btn-primario" href="#/login">
              Iniciar sesión
            </a>
          )}
          {!noExiste && (
            <button type="button" className="btn btn-secundario" onClick={() => location.reload()}>
              Reintentar
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
