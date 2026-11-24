// PLACEHOLDER: T7 (reseña) reemplaza este archivo por la pantalla real (mantener el nombre y las props).
import { PantallaPendiente } from '@/features/shell/components/PantallaPendiente';

export interface ReviewViewProps {
  bookingId: string;
}

export function ReviewView({ bookingId }: ReviewViewProps) {
  return <PantallaPendiente nombre="ReviewView" params={{ bookingId }} />;
}
