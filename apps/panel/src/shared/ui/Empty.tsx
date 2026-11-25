import type { ReactNode } from 'react';
import Icono from './Icono';
import { ICONOS, type NombreIcono } from './iconos';

export default function Empty({
  titulo,
  mensaje,
  accion,
  children,
  icono = 'alerta',
}: {
  titulo: string;
  mensaje: string;
  accion?: ReactNode;
  children?: ReactNode;
  icono?: NombreIcono;
}) {
  const extra = accion ?? children;
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center sm:px-10 sm:py-16">
      <div className="flex size-14 items-center justify-center rounded-brote bg-niebla-2 text-helecho ring-1 ring-linea">
        <Icono trazo={ICONOS[icono]} clase="size-6" />
      </div>
      <h3 className="mt-4 text-seccion">{titulo}</h3>{' '}
      <p className="mt-1 max-w-sm text-cuerpo text-tinta-2">{mensaje}</p>{' '}
      {extra != null && extra !== false && <div className="mt-5">{extra}</div>}
    </div>
  );
}
