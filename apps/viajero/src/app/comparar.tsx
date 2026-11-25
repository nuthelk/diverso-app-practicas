import { useLocalSearchParams } from 'expo-router';

import { ComparatorView } from '@/features/catalog/views/ComparatorView';
import { idsAComparar } from '@/router';

/** `/comparar?ids=a,b,c` (sin vacíos ni repetidos, máx. 3). */
export default function RutaComparar() {
  const { ids } = useLocalSearchParams<{ ids?: string }>();
  return <ComparatorView ids={idsAComparar(ids)} />;
}
