import { useLocalSearchParams } from 'expo-router';

import { AgencyView } from '@/features/agencies/views/AgencyView';
import { param } from '@/router';

/** `/agencia/:id`. */
export default function RutaAgencia() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <AgencyView agencyId={param(id)} />;
}
