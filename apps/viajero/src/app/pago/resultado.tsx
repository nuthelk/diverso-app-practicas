import { useLocalSearchParams } from 'expo-router';

import { PaymentResultView } from '@/features/checkout/views/PaymentResultView';
import { parametroOpcional } from '@/router';

/** `/pago/resultado?id=<transacción>` (vuelta de Wompi) o `?reserva=<bookingId>` («Ya pagué»). */
export default function RutaPagoResultado() {
  const { id, reserva } = useLocalSearchParams<{ id?: string; reserva?: string }>();
  return <PaymentResultView transactionId={parametroOpcional(id)} bookingId={parametroOpcional(reserva)} />;
}
