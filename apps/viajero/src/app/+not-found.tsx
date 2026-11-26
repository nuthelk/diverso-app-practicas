import { NotFoundView } from '@/features/shell/views/NotFoundView';
import { useLocation } from '@/router/location';

/** Cualquier URL que no está en la tabla (`errorBuilder` de go_router). */
export default function RutaNoEncontrada() {
  return <NotFoundView location={useLocation()} />;
}
