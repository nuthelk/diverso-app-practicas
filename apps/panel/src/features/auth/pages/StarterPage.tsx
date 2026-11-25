import Logo from '@/shared/ui/Logo';
import Spinner from '@/shared/ui/Spinner';
import AlertaError from '@/shared/ui/AlertaError';
import { useCerrarSesion } from '../hooks/useCerrarSesion';
import { useDestinoStarter } from '../hooks/useDestinoStarter';

/** Reparte a quien entra según su rol y el estado de su agencia (la decisión vive en `useDestinoStarter`). */
export default function StarterPage() {
  const { fallo, reintentar } = useDestinoStarter();
  const cerrarSesion = useCerrarSesion();

  return (
    <main className="grid min-h-screen place-items-center px-6 py-12">
      <div className="aparecer flex w-full max-w-sm flex-col items-center gap-4 text-center">
        <Logo size={40} clase="text-helecho" />
        {fallo ? (
          <>
            <h1 className="text-seccion">No pudimos abrir tu panel</h1>
            <AlertaError clase="text-left">{fallo}</AlertaError>
            <div className="flex flex-wrap justify-center gap-2">
              <button type="button" className="btn btn-primario" onClick={reintentar}>
                Reintentar
              </button>
              <button type="button" className="btn btn-secundario" onClick={() => cerrarSesion()}>
                Cerrar sesión
              </button>
            </div>
          </>
        ) : (
          <div role="status" className="flex flex-col items-center gap-3">
            <Spinner />
            <h1 className="text-seccion">Preparando tu panel…</h1>
            <p className="text-cuerpo text-tinta-2">Estamos revisando tu cuenta y tu agencia.</p>
          </div>
        )}
      </div>
    </main>
  );
}
