// PLACEHOLDER: T7 (detalle de reserva) reemplaza este archivo por la pantalla real (mantener el nombre y las props).
import { PantallaPendiente } from '@/features/shell/components/PantallaPendiente';

export interface ReservaDetalleViewProps {
  bookingId: string;
}

export function ReservaDetalleView({ bookingId }: ReservaDetalleViewProps) {
  return <PantallaPendiente nombre="ReservaDetalleView" params={{ bookingId }} />;
}
