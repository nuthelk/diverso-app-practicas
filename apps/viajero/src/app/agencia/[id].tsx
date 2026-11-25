import { useLocalSearchParams } from 'expo-router';

import { AgencyView } from '@/features/agencies/views/AgencyView';
import { parametro } from '@/router';

/** `/agencia/:id`. */
export default function RutaAgencia() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <AgencyView agencyId={parametro(id)} />;
}
