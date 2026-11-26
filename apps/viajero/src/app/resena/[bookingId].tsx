import { useLocalSearchParams } from 'expo-router';

import { ReviewView } from '@/features/bookings/views/ReviewView';
import { param } from '@/router';

/** `/resena/:bookingId`. */
export default function RutaResena() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  return <ReviewView bookingId={param(bookingId)} />;
}
