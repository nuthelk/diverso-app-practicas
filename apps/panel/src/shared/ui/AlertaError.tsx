import type { ReactNode } from 'react';
import Icono from './Icono';
import { ICONOS } from './iconos';

/** Error en línea (falló un guardado, un campo no es válido): se anuncia como alerta y lleva ícono, no solo color. */
export default function AlertaError({ id, clase = '', children }: { id?: string; clase?: string; children?: ReactNode }) {
  return (
    <p id={id} className={`flex items-start gap-2 font-semibold text-heliconia ${clase}`} role="alert">
      <Icono trazo={ICONOS.alerta} clase="mt-[3px] size-4" />
      <span>{children}</span>
    </p>
  );
}
