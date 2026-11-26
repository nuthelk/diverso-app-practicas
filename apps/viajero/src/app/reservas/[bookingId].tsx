import { useLocalSearchParams } from 'expo-router';

import { BookingDetailView } from '@/features/bookings/views/BookingDetailView';
import { param } from '@/router';

/** `/reservas/:bookingId` (detalle, fuera del shell). */
export default function BookingDetailRoute() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  return <BookingDetailView bookingId={param(bookingId)} />;
}
