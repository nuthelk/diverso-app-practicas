import { useLocalSearchParams } from 'expo-router';

import { BookingDetailView } from '@/features/bookings/views/BookingDetailView';
import { parametro } from '@/router';

/** `/reservas/:bookingId` (detalle, fuera del shell). */
export default function RutaReservaDetalle() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  return <BookingDetailView bookingId={parametro(bookingId)} />;
}
