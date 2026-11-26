import { useLocalSearchParams } from 'expo-router';

import { PaymentResultView } from '@/features/checkout/views/PaymentResultView';
import { optionalParam } from '@/router';

/** `/pago/resultado?id=<transacción>` (vuelta de Wompi) o `?reserva=<bookingId>` («Ya pagué»). */
export default function RutaPagoResultado() {
  const { id, reserva } = useLocalSearchParams<{ id?: string; reserva?: string }>();
  return <PaymentResultView transactionId={optionalParam(id)} bookingId={optionalParam(reserva)} />;
}
