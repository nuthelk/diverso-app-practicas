import type { ReactNode } from 'react';
import Icono from './Icono';
import { ICONOS } from './iconos';

/** Cabecera de pantalla: título (28 px), una línea de contexto y, a la derecha, la acción principal. */
export default function PageHeader({
  titulo,
  atras,
  junto,
  contexto,
  accion,
}: {
  titulo: string;
  /** Enlace pequeño sobre el título para volver a la lista. */
  atras?: { href: string; texto: string };
  /** Algo que va pegado al título (una píldora de estado). */
  junto?: ReactNode;
  contexto?: ReactNode;
  accion?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end gap-x-4 gap-y-3">
      <div className="min-w-0 flex-1 basis-[260px]">
        {atras && (
          <a href={atras.href} className="enlace mb-1 inline-flex min-h-11 items-center gap-1.5 text-cuerpo">
            <Icono trazo={ICONOS.atras} clase="size-4" />
            {atras.texto}
          </a>
        )}{' '}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="text-pagina text-balance">{titulo}</h1>{' '}
          {junto}
        </div>{' '}
        {contexto != null && contexto !== false && (
          <p className="mt-1 max-w-[68ch] text-cuerpo text-tinta-2">{contexto}</p>
        )}
      </div>{' '}
      {accion != null && accion !== false && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{accion}</div>
      )}
    </header>
  );
}
