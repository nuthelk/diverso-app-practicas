import { useId, type ReactNode } from 'react';

/** Tarjeta: con título lleva una cabecera con línea inferior, una acción a la derecha y descripción opcional. */
export default function Tarjeta({
  titulo,
  descripcion,
  etiqueta,
  accion,
  sinRelleno = false,
  clase = '',
  children,
}: {
  titulo?: string;
  descripcion?: string;
  /** Nombre accesible cuando la tarjeta no lleva título visible. */
  etiqueta?: string;
  accion?: ReactNode;
  /** El contenido llega a los bordes (tablas, listas con divisores). */
  sinRelleno?: boolean;
  clase?: string;
  children: ReactNode;
}) {
  const uid = useId();
  return (
    <section
      className={`tarjeta ${titulo ? 'overflow-hidden' : ''} ${clase}`}
      aria-labelledby={titulo ? uid : undefined}
      aria-label={titulo ? undefined : etiqueta}
    >
      {titulo && (
        <div className="border-b border-linea px-5 pt-4 pb-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id={uid} className="text-seccion">
              {titulo}
            </h2>{' '}
            {accion}
          </div>{' '}
          {descripcion && <p className="mt-0.5 text-detalle text-tinta-2">{descripcion}</p>}
        </div>
      )}{' '}
      <div className={sinRelleno ? '' : 'p-5'}>{children}</div>
    </section>
  );
}
