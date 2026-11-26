import { Redirect, type Href } from 'expo-router';

import { AppRoutes } from '@/router';

/** `/exito` (legado) → Mis reservas. */
export default function LegacySuccessRoute() {
  return <Redirect href={AppRoutes.bookings as Href} />;
}
