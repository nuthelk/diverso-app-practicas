import { useLocalSearchParams } from 'expo-router';

import { BookingConfirmationView } from '@/features/checkout/views/BookingConfirmationView';
import { parametro } from '@/router';

/** `/reserva/:bookingId` (confirmación, con zoom). */
export default function RutaReserva() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  return <BookingConfirmationView bookingId={parametro(bookingId)} />;
}
