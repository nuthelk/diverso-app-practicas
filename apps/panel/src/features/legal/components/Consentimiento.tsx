import { useId, type Dispatch, type SetStateAction } from 'react';
import AlertaError from '@/shared/ui/AlertaError';

/**
 * Casillas de autorización (Ley 1581 de 2012). Deben marcarse de forma
 * expresa: no vienen preseleccionadas y cada una enlaza su documento.
 * Si falta una, quien usa el componente pasa el texto del error de esa casilla.
 *
 * `datos` y `terminos` los guarda el padre: llegan con su setter (`setDatos`, `setTerminos`).
 */
export default function Consentimiento({
  datos,
  setDatos,
  terminos,
  setTerminos,
  terminosDoc = 'terminos-agencias',
  errorDatos,
  errorTerminos,
}: {
  datos: boolean;
  setDatos: Dispatch<SetStateAction<boolean>>;
  terminos: boolean;
  setTerminos: Dispatch<SetStateAction<boolean>>;
  terminosDoc?: string;
  errorDatos?: string;
  errorTerminos?: string;
}) {
  const uid = useId();

  return (
    <fieldset className="space-y-3">
      <legend className="sr-only">Autorizaciones</legend>
      <div>
        <label className="flex cursor-pointer items-start gap-3 text-cuerpo">
          <input
            type="checkbox"
            required
            checked={datos}
            onChange={(e) => setDatos(e.target.checked)}
            className="mt-0.5 size-5 shrink-0 accent-helecho"
            aria-invalid={errorDatos ? 'true' : undefined}
            aria-describedby={errorDatos ? `${uid}-datos` : undefined}
          />
          <span className="text-tinta-2">
            Autorizo de manera previa, expresa e informada el tratamiento de mis datos personales según la{' '}
            <a href="#/legal/privacidad" target="_blank" rel="noopener" className="enlace">
              política de tratamiento de datos<span className="sr-only"> (se abre en una pestaña nueva)</span>
            </a>{' '}
            (Ley 1581 de 2012).
          </span>
        </label>
        {errorDatos && (
          <AlertaError id={`${uid}-datos`} clase="mt-1 ml-8 text-detalle">
            {errorDatos}
          </AlertaError>
        )}
      </div>
      <div>
        <label className="flex cursor-pointer items-start gap-3 text-cuerpo">
          <input
            type="checkbox"
            required
            checked={terminos}
            onChange={(e) => setTerminos(e.target.checked)}
            className="mt-0.5 size-5 shrink-0 accent-helecho"
            aria-invalid={errorTerminos ? 'true' : undefined}
            aria-describedby={errorTerminos ? `${uid}-terminos` : undefined}
          />
          <span className="text-tinta-2">
            Acepto los{' '}
            <a href={'#/legal/' + terminosDoc} target="_blank" rel="noopener" className="enlace">
              términos y condiciones<span className="sr-only"> (se abre en una pestaña nueva)</span>
            </a>
            .
          </span>
        </label>
        {errorTerminos && (
          <AlertaError id={`${uid}-terminos`} clase="mt-1 ml-8 text-detalle">
            {errorTerminos}
          </AlertaError>
        )}
      </div>
    </fieldset>
  );
}
