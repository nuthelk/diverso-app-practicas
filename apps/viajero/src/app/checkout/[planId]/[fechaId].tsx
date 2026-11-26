import { useLocalSearchParams } from 'expo-router';

import { CheckoutView } from '@/features/checkout/views/CheckoutView';
import { param } from '@/router';

/** `/checkout/:planId/:fechaId`. */
export default function CheckoutRoute() {
  const { planId, fechaId: dateId } = useLocalSearchParams<{ planId: string; fechaId: string }>();
  return <CheckoutView planId={param(planId)} dateId={param(dateId)} />;
}
