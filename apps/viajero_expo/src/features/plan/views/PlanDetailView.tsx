// PLACEHOLDER: T5 (ficha del plan) reemplaza este archivo por la pantalla real (mantener el nombre y las props).
import { PantallaPendiente } from '@/features/shell/components/PantallaPendiente';

export interface PlanDetailViewProps {
  planId: string;
}

export function PlanDetailView({ planId }: PlanDetailViewProps) {
  return <PantallaPendiente nombre="PlanDetailView" params={{ planId }} />;
}
