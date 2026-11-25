import type { AriaRole, ReactNode } from 'react';
import Icono from './Icono';
import { ICONOS } from './iconos';
import { BROTES_AVISO, TONOS_AVISO } from './tonos';

// Una información no lleva el triángulo de advertencia.
const ICONO_DEL_TONO = { info: ICONOS.info, alerta: ICONOS.alerta, error: ICONOS.alerta } as const;

/** Franja de aviso con el ícono en un brote, tinte del tono y, si hace falta, una acción a la derecha. */
export default function Aviso({
  tono = 'alerta',
  role,
  children,
  accion,
}: {
  tono?: keyof typeof TONOS_AVISO;
  role?: AriaRole;
  children: ReactNode;
  accion?: ReactNode;
}) {
  return (
    <div
      className={`flex flex-wrap items-center gap-x-3.5 gap-y-2 rounded-hoja border px-4 py-3 text-cuerpo ${TONOS_AVISO[tono]}`}
      role={role}
    >
      <span className={`grid size-9 shrink-0 place-items-center rounded-brote ${BROTES_AVISO[tono]}`}>
        <Icono trazo={ICONO_DEL_TONO[tono]} clase="size-[19px]" />
      </span>
      <span className="min-w-[200px] flex-1">{children}</span>{' '}
      {accion}
    </div>
  );
}
