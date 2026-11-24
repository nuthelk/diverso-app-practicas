import { useLocalSearchParams } from 'expo-router';

import { AgenciaView } from '@/features/agencies/views/AgenciaView';
import { parametro } from '@/router';

/** `/agencia/:id`. */
export default function RutaAgencia() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <AgenciaView agencyId={parametro(id)} />;
}
