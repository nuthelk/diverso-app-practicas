import { useUnstableGlobalHref } from 'expo-router';

import { PaginaNoEncontradaView } from '@/features/shell/views/PaginaNoEncontradaView';

/** Cualquier URL que no está en la tabla (`errorBuilder` de go_router). */
export default function RutaNoEncontrada() {
  return <PaginaNoEncontradaView ubicacion={useUnstableGlobalHref()} />;
}
