import { useLocalSearchParams } from 'expo-router';

import { CheckoutView } from '@/features/checkout/views/CheckoutView';
import { parametro } from '@/router';

/** `/checkout/:planId/:fechaId`. */
export default function RutaCheckout() {
  const { planId, fechaId } = useLocalSearchParams<{ planId: string; fechaId: string }>();
  return <CheckoutView planId={parametro(planId)} fechaId={parametro(fechaId)} />;
}
