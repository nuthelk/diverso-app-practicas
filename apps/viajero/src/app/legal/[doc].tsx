import { useLocalSearchParams } from 'expo-router';

import { LegalView } from '@/features/legal/views/LegalView';
import { param } from '@/router';

/** `/legal/:doc` (accesible siempre, con o sin sesión). */
export default function LegalRoute() {
  const { doc } = useLocalSearchParams<{ doc: string }>();
  return <LegalView docId={param(doc)} />;
}
