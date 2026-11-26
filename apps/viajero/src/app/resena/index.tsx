import { Redirect, type Href } from 'expo-router';

import { AppRoutes } from '@/router';

/** `/resena` (legado) → Mis reservas. */
export default function LegacyReviewRoute() {
  return <Redirect href={AppRoutes.bookings as Href} />;
}
