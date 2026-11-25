import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { useDependencies } from '@/composition';
import type { Plan, PlanDate } from '@/core';
import { BarraSuperior } from '@/features/shell/components/BarraSuperior';
import { AppRoutes, volverSeguro } from '@/router';
import { OutlinedButton, SectionLabel } from '@/ui/components';
import { useTheme } from '@/ui/theme';

import { AvisoErrorPago } from '../components/AvisoErrorPago';
import { BarraPagar } from '../components/BarraPagar';
import { PagoWompiCard } from '../components/PagoWompiCard';
import { ReservaPendienteAviso } from '../components/ReservaPendienteAviso';
import { ResumenPago } from '../components/ResumenPago';
import { ResumenPlan } from '../components/ResumenPlan';
import { SelectorPersonas } from '../components/SelectorPersonas';
import { irA } from '../ir-a';
import { useAbrirPago } from '../useAbrirPago';
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
  const { abrirPago, modalPago } = useAbrirPago(pasarela);

  useEffect(() => {
    void vm.cargarPendiente(fecha);
    // Solo al abrir el checkout (`initState`).
  }, []);

  /** Respaldo si la redirección no llegó: el servidor consulta a Wompi por la reserva. */
  const yaPague = (bookingId: string) => irA(router, AppRoutes.pagoDeReserva(bookingId));

  const { pendiente, error, bookingId } = vm;
  return (
    <View testID="pantalla-CheckoutView" style={[estilos.pantalla, { backgroundColor: tema.pageBackground }]}>
      <BarraSuperior titulo="Confirmar y pagar" onVolver={() => volverSeguro(router, AppRoutes.plan(plan.id))} />
      <ScrollView testID="checkout-scroll" style={estilos.pantalla} contentContainerStyle={estilos.lista}>
        {/* Reserva pendiente de esta fecha (p. ej. volvió atrás desde Wompi). */}
        {pendiente !== null ? (
          <>
            <ReservaPendienteAviso
              reserva={pendiente}
              ocupado={vm.procesando}
              onCompletar={() => void vm.completarPendiente(abrirPago)}
              onVerificar={() => yaPague(pendiente.id)}
              onCancelar={() => void vm.cancelarPendiente()}
            />
            <View style={{ height: 16 }} />
          </>
        ) : null}
        <ResumenPlan plan={plan} fecha={fecha} />
        <View style={{ height: 22 }} />
        <SelectorPersonas
          pax={vm.pax}
          cupos={fecha.availableSpots}
          puedeQuitar={vm.puedeQuitarPersona}
          puedeAgregar={vm.puedeAgregarPersona(fecha.availableSpots)}
          onCambiar={vm.setPax}
        />
        <View style={{ height: 22 }} />
        {/* Pago con Wompi (modo prueba). */}
        <SectionLabel text="Pago" />
        <PagoWompiCard />
        <View style={{ height: 22 }} />
        <ResumenPago precioPorPersona={plan.priceCop} pax={vm.pax} total={vm.total(plan)} />
        {error !== null ? (
          <>
            <View style={{ height: 16 }} />
            <AvisoErrorPago mensaje={error} />
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
      <BarraPagar
        total={vm.total(plan)}
        pax={vm.pax}
        procesando={vm.procesando}
        onPagar={vm.puedePagar ? () => void vm.pagar(fecha, abrirPago) : null}
      />
      {modalPago}
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1 },
  // `ListView(padding: 20, 8, 20, …)`: abajo basta el aire de una lista (la barra ya no tapa nada).
  lista: { paddingLeft: 20, paddingTop: 8, paddingRight: 20, paddingBottom: 24 },
});
