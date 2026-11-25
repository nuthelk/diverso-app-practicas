import { useLocalSearchParams } from 'expo-router';

import { PlanDetailView } from '@/features/plan/views/PlanDetailView';
import { parametro } from '@/router';

/** `/plan/:id`. */
export default function RutaPlan() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PlanDetailView planId={parametro(id)} />;
}
