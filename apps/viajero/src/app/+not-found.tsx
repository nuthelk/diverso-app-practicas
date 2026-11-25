import { PaginaNoEncontradaView } from '@/features/shell/views/PaginaNoEncontradaView';
import { useUbicacion } from '@/router/ubicacion';

/** Cualquier URL que no está en la tabla (`errorBuilder` de go_router). */
export default function RutaNoEncontrada() {
  return <PaginaNoEncontradaView ubicacion={useUbicacion()} />;
}
