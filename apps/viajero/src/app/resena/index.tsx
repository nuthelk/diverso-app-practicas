import { Redirect, type Href } from 'expo-router';

import { AppRoutes } from '@/router';

/** `/resena` (legado) → Mis reservas. */
export default function RutaResenaLegada() {
  return <Redirect href={AppRoutes.reservas as Href} />;
}
