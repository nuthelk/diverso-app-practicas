import { useLocalSearchParams } from 'expo-router';

import { LegalView } from '@/features/legal/views/LegalView';
import { parametro } from '@/router';

/** `/legal/:doc` (accesible siempre, con o sin sesión). */
export default function RutaLegal() {
  const { doc } = useLocalSearchParams<{ doc: string }>();
  return <LegalView docId={parametro(doc)} />;
}
