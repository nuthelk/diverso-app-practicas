// PLACEHOLDER: T6 (confirmación de reserva) reemplaza este archivo por la pantalla real (mantener el nombre y las props).
import { PantallaPendiente } from '@/features/shell/components/PantallaPendiente';

export interface ReservaViewProps {
  bookingId: string;
}

export function ReservaView({ bookingId }: ReservaViewProps) {
  return <PantallaPendiente nombre="ReservaView" params={{ bookingId }} />;
}
