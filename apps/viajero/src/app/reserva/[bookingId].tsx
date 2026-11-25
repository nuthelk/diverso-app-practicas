import { useLocalSearchParams } from 'expo-router';

import { ReservaView } from '@/features/checkout/views/ReservaView';
import { parametro } from '@/router';

/** `/reserva/:bookingId` (confirmación, con zoom). */
export default function RutaReserva() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  return <ReservaView bookingId={parametro(bookingId)} />;
}
