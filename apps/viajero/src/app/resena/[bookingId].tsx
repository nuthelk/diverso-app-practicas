import { useLocalSearchParams } from 'expo-router';

import { ReviewView } from '@/features/bookings/views/ReviewView';
import { param } from '@/router';

/** `/resena/:bookingId`. */
export default function ReviewRoute() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  return <ReviewView bookingId={param(bookingId)} />;
}
