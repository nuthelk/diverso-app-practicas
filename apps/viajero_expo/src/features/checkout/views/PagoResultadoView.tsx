// PLACEHOLDER: T6 (resultado del pago) reemplaza este archivo por la pantalla real (mantener el nombre y las props).
import { PantallaPendiente } from '@/features/shell/components/PantallaPendiente';

export interface PagoResultadoViewProps {
  /** `?id=`: transacción de Wompi (vuelta del checkout). */
  transactionId: string | null;
  /** `?reserva=`: «Ya pagué, verificar» de una reserva. */
  bookingId: string | null;
}

export function PagoResultadoView({ transactionId, bookingId }: PagoResultadoViewProps) {
  return <PantallaPendiente nombre="PagoResultadoView" params={{ transactionId, bookingId }} />;
}
