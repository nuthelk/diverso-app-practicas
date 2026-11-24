// PLACEHOLDER: T5 (comparador) reemplaza este archivo por la pantalla real (mantener el nombre y las props).
import { PantallaPendiente } from '@/features/shell/components/PantallaPendiente';

export interface ComparatorViewProps {
  /** Ids de `?ids=a,b,c` ya limpios (sin vacíos ni repetidos, máx. 3: `idsAComparar`). */
  ids: string[];
}

export function ComparatorView({ ids }: ComparatorViewProps) {
  return <PantallaPendiente nombre="ComparatorView" params={{ ids }} />;
}
