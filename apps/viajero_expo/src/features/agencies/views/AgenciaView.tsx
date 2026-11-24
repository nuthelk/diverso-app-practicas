// PLACEHOLDER: T5 (página de agencia) reemplaza este archivo por la pantalla real (mantener el nombre y las props).
import { PantallaPendiente } from '@/features/shell/components/PantallaPendiente';

export interface AgenciaViewProps {
  agencyId: string;
}

export function AgenciaView({ agencyId }: AgenciaViewProps) {
  return <PantallaPendiente nombre="AgenciaView" params={{ agencyId }} />;
}
