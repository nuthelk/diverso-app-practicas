import { useLocalSearchParams } from 'expo-router';

import { ReservaDetalleView } from '@/features/bookings/views/ReservaDetalleView';
import { parametro } from '@/router';

/** `/reservas/:bookingId` (detalle, fuera del shell). */
export default function RutaReservaDetalle() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  return <ReservaDetalleView bookingId={parametro(bookingId)} />;
}
