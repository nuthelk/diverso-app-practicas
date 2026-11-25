import { useLocalSearchParams } from 'expo-router';

import { PagoResultadoView } from '@/features/checkout/views/PagoResultadoView';
import { parametroOpcional } from '@/router';

/** `/pago/resultado?id=<transacción>` (vuelta de Wompi) o `?reserva=<bookingId>` («Ya pagué»). */
export default function RutaPagoResultado() {
  const { id, reserva } = useLocalSearchParams<{ id?: string; reserva?: string }>();
  return <PagoResultadoView transactionId={parametroOpcional(id)} bookingId={parametroOpcional(reserva)} />;
}
