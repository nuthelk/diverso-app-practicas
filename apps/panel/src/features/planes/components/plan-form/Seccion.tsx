import type { ReactNode } from 'react';
import Tarjeta from '@/shared/ui/Tarjeta';

/** Tarjeta con título que envuelve cada bloque del formulario de plan. */
export default function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return <Tarjeta titulo={titulo}>{children}</Tarjeta>;
}
