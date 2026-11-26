import { useLocalSearchParams } from 'expo-router';

import { PlanDetailView } from '@/features/plan/views/PlanDetailView';
import { param } from '@/router';

/** `/plan/:id`. */
export default function PlanRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PlanDetailView planId={param(id)} />;
}
