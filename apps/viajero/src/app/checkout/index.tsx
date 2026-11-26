import { Redirect, type Href } from 'expo-router';

import { AppRoutes } from '@/router';

/** `/checkout` (legado: dependía de `extra`, que se pierde al recargar) → inicio. */
export default function RutaCheckoutLegada() {
  return <Redirect href={AppRoutes.explore as Href} />;
}
