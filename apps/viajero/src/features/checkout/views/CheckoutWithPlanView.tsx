import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { useDependencies } from '@/composition';
import type { Plan, PlanDate } from '@/core';
import { TopBar } from '@/features/shell/components/TopBar';
import { AppRoutes, safeGoBack } from '@/router';
import { OutlinedButton, SectionLabel } from '@/ui/components';
import { useTheme } from '@/ui/theme';

import { PaymentErrorNotice } from '../components/PaymentErrorNotice';
import { PayBar } from '../components/PayBar';
import { WompiPaymentCard } from '../components/WompiPaymentCard';
import { PendingBookingNotice } from '../components/PendingBookingNotice';
import { PaymentSummary } from '../components/PaymentSummary';
import { PlanSummary } from '../components/PlanSummary';
import { TravelersPicker } from '../components/TravelersPicker';
import { goTo } from '../go-to';
import { useOpenPayment } from '../useOpenPayment';
import { useCheckoutViewModel } from '../view-models/useCheckoutViewModel';

/**
 * Checkout (`CheckoutView` de Flutter): resumen claro, personas, pago con Wompi (modo prueba) y
 * total final, todo en una pantalla, sin pasos innecesarios. El estado vive en
 * `useCheckoutViewModel` (MVVM). La barra de pago va debajo del scroll.
 */
export function CheckoutWithPlanView({ plan, planDate }: { plan: Plan; planDate: PlanDate }) {
  const theme = useTheme();
  const router = useRouter();
  const { reservas: bookings, pasarela: gateway } = useDependencies();
  const vm = useCheckoutViewModel({ bookings });
  const { openPayment, paymentModal } = useOpenPayment(gateway);

  useEffect(() => {
    void vm.loadPending(planDate);
    // Solo al abrir el checkout (`initState`).
  }, []);

  /** Respaldo si la redirección no llegó: el servidor consulta a Wompi por la reserva. */
  const alreadyPaid = (bookingId: string) => goTo(router, AppRoutes.paymentForBooking(bookingId));

  const { pending, error, bookingId } = vm;
  return (
    <View testID="pantalla-CheckoutView" style={[styles.screen, { backgroundColor: theme.pageBackground }]}>
      <TopBar title="Confirmar y pagar" onBack={() => safeGoBack(router, AppRoutes.plan(plan.id))} />
      <ScrollView testID="checkout-scroll" style={styles.screen} contentContainerStyle={styles.list}>
        {/* Reserva pendiente de esta fecha (p. ej. volvió atrás desde Wompi). */}
        {pending !== null ? (
          <>
            <PendingBookingNotice
              booking={pending}
              busy={vm.processing}
              onComplete={() => void vm.completePending(openPayment)}
              onVerify={() => alreadyPaid(pending.id)}
              onCancel={() => void vm.cancelPending()}
            />
            <View style={{ height: 16 }} />
          </>
        ) : null}
        <PlanSummary plan={plan} planDate={planDate} />
        <View style={{ height: 22 }} />
        <TravelersPicker
          pax={vm.pax}
          availableSpots={planDate.availableSpots}
          canRemove={vm.canRemoveTraveler}
          canAdd={vm.canAddTraveler(planDate.availableSpots)}
          onChange={vm.setPax}
        />
        <View style={{ height: 22 }} />
        {/* Pago con Wompi (modo prueba). */}
        <SectionLabel text="Pago" />
        <WompiPaymentCard />
        <View style={{ height: 22 }} />
        <PaymentSummary pricePerPerson={plan.priceCop} pax={vm.pax} total={vm.total(plan)} />
        {error !== null ? (
          <>
            <View style={{ height: 16 }} />
            <PaymentErrorNotice message={error} />
          </>
        ) : null}
        {bookingId !== null ? (
          <>
            <View style={{ height: 10 }} />
            <OutlinedButton
              icon="refresh_rounded"
              text="Ya pagué, verificar"
              onPress={vm.processing ? null : () => alreadyPaid(bookingId)}
            />
          </>
        ) : null}
      </ScrollView>
      <PayBar
        total={vm.total(plan)}
        pax={vm.pax}
        processing={vm.processing}
        onPay={vm.canPay ? () => void vm.pay(planDate, openPayment) : null}
      />
      {paymentModal}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  // `ListView(padding: 20, 8, 20, …)`: abajo basta el aire de una lista (la barra ya no tapa nada).
  list: { paddingLeft: 20, paddingTop: 8, paddingRight: 20, paddingBottom: 24 },
});
