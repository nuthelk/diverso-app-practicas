// PLACEHOLDER: T6 (checkout) reemplaza este archivo por la pantalla real (mantener el nombre y las props).
import { PantallaPendiente } from '@/features/shell/components/PantallaPendiente';

export interface CheckoutViewProps {
  planId: string;
  fechaId: string;
}

export function CheckoutView({ planId, fechaId }: CheckoutViewProps) {
  return <PantallaPendiente nombre="CheckoutView" params={{ planId, fechaId }} />;
}
