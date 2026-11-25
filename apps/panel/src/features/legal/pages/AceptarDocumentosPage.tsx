import Logo from '@/shared/ui/Logo';
import AlertaError from '@/shared/ui/AlertaError';
import { useCerrarSesion } from '@/features/auth/hooks/useCerrarSesion';
import Consentimiento from '../components/Consentimiento';
import { useAceptarDocumentos } from '../hooks/useAceptarDocumentos';

// Se llega aquí cuando la cuenta no tiene aceptada la versión vigente
// (cuentas creadas antes de la v1 o cambio de versión de los documentos).
export default function AceptarDocumentosPage() {
  const { datos, setDatos, terminos, setTerminos, guardando, error, intentado, formulario, aceptar } = useAceptarDocumentos();
  // Cierra la sesión y lleva a /login.
  const cerrarSesion = useCerrarSesion();

  return (
    <main className="grid min-h-screen place-items-center bg-niebla px-6 py-12">
      <form ref={formulario} className="tarjeta aparecer w-full max-w-lg p-6 sm:p-8" onSubmit={aceptar} noValidate>
        <Logo size={36} clase="text-helecho" />
        <h1 className="mt-4 text-pagina">Antes de continuar</h1>
        <p className="mt-2 text-cuerpo text-tinta-2">
          Actualizamos nuestros documentos legales. Necesitamos tu autorización expresa para seguir tratando los datos de tu
          cuenta. Léelos con los enlaces de cada casilla.
        </p>

        <div className="mt-6">
          <Consentimiento
            datos={datos}
            setDatos={setDatos}
            terminos={terminos}
            setTerminos={setTerminos}
            errorDatos={intentado && !datos ? 'Marca la autorización de datos para continuar.' : undefined}
            errorTerminos={intentado && !terminos ? 'Acepta los términos y condiciones para continuar.' : undefined}
          />
        </div>

        {error && <AlertaError clase="mt-4">{error}</AlertaError>}

        <div className="mt-7 flex items-center justify-between gap-3">
          <button type="button" className="btn btn-secundario" onClick={() => cerrarSesion()}>
            Salir
          </button>
          <button type="submit" className="btn btn-primario" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Aceptar y continuar'}
          </button>
        </div>
      </form>
    </main>
  );
}
