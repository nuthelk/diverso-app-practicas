import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { useDependencies } from '@/composition';
import type { Plan, PlanDate } from '@/core';
import { TopBar } from '@/features/shell/components/TopBar';
import { AppRoutes, volverSeguro } from '@/router';
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
export function CheckoutConPlanView({ plan, fecha }: { plan: Plan; fecha: PlanDate }) {
  const tema = useTheme();
  const router = useRouter();
  const { reservas, pasarela } = useDependencies();
  const vm = useCheckoutViewModel({ reservas });
  const { openPayment, paymentModal } = useOpenPayment(pasarela);

  useEffect(() => {
    void vm.cargarPendiente(fecha);
    // Solo al abrir el checkout (`initState`).
  }, []);

  /** Respaldo si la redirección no llegó: el servidor consulta a Wompi por la reserva. */
  const yaPague = (bookingId: string) => goTo(router, AppRoutes.pagoDeReserva(bookingId));

  const { pendiente, error, bookingId } = vm;
  return (
    <View testID="pantalla-CheckoutView" style={[estilos.pantalla, { backgroundColor: tema.pageBackground }]}>
      <TopBar title="Confirmar y pagar" onBack={() => volverSeguro(router, AppRoutes.plan(plan.id))} />
      <ScrollView testID="checkout-scroll" style={estilos.pantalla} contentContainerStyle={estilos.lista}>
        {/* Reserva pendiente de esta fecha (p. ej. volvió atrás desde Wompi). */}
        {pendiente !== null ? (
          <>
            <PendingBookingNotice
              booking={pendiente}
              busy={vm.procesando}
              onComplete={() => void vm.completarPendiente(openPayment)}
              onVerify={() => yaPague(pendiente.id)}
              onCancel={() => void vm.cancelarPendiente()}
            />
            <View style={{ height: 16 }} />
          </>
        ) : null}
        <PlanSummary plan={plan} planDate={fecha} />
        <View style={{ height: 22 }} />
        <TravelersPicker
          pax={vm.pax}
          availableSpots={fecha.availableSpots}
          canRemove={vm.puedeQuitarPersona}
          canAdd={vm.puedeAgregarPersona(fecha.availableSpots)}
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
              onPress={vm.procesando ? null : () => yaPague(bookingId)}
            />
          </>
        ) : null}
      </ScrollView>
      <PayBar
        total={vm.total(plan)}
        pax={vm.pax}
        processing={vm.procesando}
        onPay={vm.puedePagar ? () => void vm.pagar(fecha, openPayment) : null}
      />
      {paymentModal}
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1 },
  // `ListView(padding: 20, 8, 20, …)`: abajo basta el aire de una lista (la barra ya no tapa nada).
  lista: { paddingLeft: 20, paddingTop: 8, paddingRight: 20, paddingBottom: 24 },
});
