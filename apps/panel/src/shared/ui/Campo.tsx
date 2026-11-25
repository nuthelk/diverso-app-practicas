import { useId, type ReactNode } from 'react';
import AlertaError from './AlertaError';

/** Lo que el control recibe del `Campo`: se esparce sobre el <input>, <textarea> o botón. */
export interface AtributosCampo {
  id: string;
  'aria-describedby'?: string;
  'aria-invalid'?: 'true';
}

/**
 * Campo de formulario: etiqueta visible ligada al control, ayuda opcional y error. El control se dibuja con `control`
 * y recibe el `id` y los `aria-*` que lo conectan con su etiqueta, su ayuda y su error.
 */
export default function Campo({
  etiqueta,
  ayuda,
  error,
  clase = '',
  control,
}: {
  etiqueta: string;
  ayuda?: string;
  error?: string;
  clase?: string;
  control: (atributos: AtributosCampo) => ReactNode;
}) {
  const uid = useId();
  const idAyuda = `${uid}-ayuda`;
  const idError = `${uid}-error`;
  const describedby = [ayuda && idAyuda, error && idError].filter(Boolean).join(' ') || undefined;

  return (
    <div className={clase}>
      <label className="etiqueta-campo" htmlFor={`${uid}-campo`}>
        {etiqueta}
      </label>{' '}
      {control({ id: `${uid}-campo`, 'aria-describedby': describedby, 'aria-invalid': error ? 'true' : undefined })}{' '}
      {ayuda && (
        <p id={idAyuda} className="mt-1 text-detalle text-tinta-2">
          {ayuda}
        </p>
      )}{' '}
      {error && (
        <AlertaError id={idError} clase="mt-1 text-detalle">
          {error}
        </AlertaError>
      )}
    </div>
  );
}
