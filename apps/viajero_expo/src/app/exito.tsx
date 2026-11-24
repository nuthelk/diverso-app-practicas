import { Redirect, type Href } from 'expo-router';

import { AppRoutes } from '@/router';

/** `/exito` (legado) → Mis reservas. */
export default function RutaExitoLegada() {
  return <Redirect href={AppRoutes.reservas as Href} />;
}
