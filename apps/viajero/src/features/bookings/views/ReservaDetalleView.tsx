import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { BackHandler, ScrollView, StyleSheet, View } from 'react-native';

import type { Booking } from '@/core';
import { useDependencies } from '@/composition';
import { goTo } from '@/features/checkout/go-to';
import { useOpenPayment } from '@/features/checkout/useOpenPayment';
import { Snackbar } from '@/features/shared/snackbar';
import { TopBar } from '@/features/shell/components/TopBar';
import { AppRoutes, volverSeguro } from '@/router';
import { EmptyState, FilledButton, Skeleton } from '@/ui/components';
import { AppInsets, useTheme } from '@/ui/theme';

import { useBookingActions } from '../booking-actions';
import { BookingDetail } from '../components/BookingDetail';
import { preloadBooking, returnResult, preloadedBooking, useOnReturn } from '../between-screens';
import { useReservaDetalleViewModel } from '../view-models/useReservaDetalleViewModel';

export interface ReservaDetalleViewProps {
  bookingId: string;
}

/**
 * `/reservas/:bookingId` (`ReservaDetalleView`): detalle de una reserva propia (estado, salida,
 * punto de encuentro, pago, itinerario, política y acciones). Si «Mis reservas» adelantó la
 * reserva se pinta de inmediato; sin ella (recarga en web, enlace directo) se carga por id.
 *
 * «Resultado al volver» (el `pop(cambio)` de Flutter): en cuanto hay un cambio (cancelación,
 * aunque el servidor la rechace; pago; reseña) se deja `true` para la lista con
 * `devolverResultado`; así vale también para el gesto atrás de iOS. El botón atrás de Android
 * (el `PopScope(canPop: false)`) pasa por el mismo «Volver»: sin pantalla previa lleva a «Mis
 * reservas» en vez de salir de la app.
 */
export function ReservaDetalleView({ bookingId }: ReservaDetalleViewProps) {
  const tema = useTheme();
  const router = useRouter();
  const { reservas, pasarela } = useDependencies();
  const inicial = useRef(preloadedBooking(bookingId)).current;
  const vm = useReservaDetalleViewModel({ reservas, bookingId, inicial });
  const { openPayment, paymentModal } = useOpenPayment(pasarela);
  const { cancelWithConfirmation, completePayment, dialog } = useBookingActions(vm, openPayment);
  const alVolver = useOnReturn();
  const { cargar, cambio, pagoIntentado, resenaPublicada } = vm;
  const montada = useRef(true);
  const rutaPropia = AppRoutes.reservaDetalle(bookingId);

  useEffect(() => {
    montada.current = true;
    if (inicial === null) void cargar();
    return () => {
      montada.current = false;
    };
    // Solo al montar (el `initState` de Flutter).
  }, []);

  useEffect(() => {
    if (cambio) returnResult(rutaPropia, true);
  }, [cambio, rutaPropia]);

  const volver = useCallback(() => volverSeguro(router, AppRoutes.reservas), [router]);

  useFocusEffect(
    useCallback(() => {
      const suscripcion = BackHandler.addEventListener('hardwareBackPress', () => {
        volver();
        return true;
      });
      return () => suscripcion.remove();
    }, [volver]),
  );

  const pagar = async (b: Booking) => {
    await completePayment(b);
    if (montada.current) await pagoIntentado();
  };

  const resenar = (b: Booking) => {
    preloadBooking(b);
    alVolver(AppRoutes.resena(b.id), (reseno) => {
      if (reseno === true) resenaPublicada();
    });
    router.push(AppRoutes.resena(b.id) as Href);
  };

  /** Marco de las pantallas sin reserva (cargando / error): barra con «Volver». */
  const marco = (cuerpo: ReactNode) => (
    <View testID="pantalla-ReservaDetalleView" style={[estilos.flex, { backgroundColor: tema.pageBackground }]}>
      <TopBar title={null} onBack={volver} />
      <View style={estilos.flex}>{cuerpo}</View>
      <Snackbar />
    </View>
  );

  const b = vm.reserva;
  if (b !== null) {
    return (
      <View testID="pantalla-ReservaDetalleView" style={estilos.flex}>
        <BookingDetail
          booking={b}
          canCancel={vm.puedeCancelar(b)}
          canReview={vm.puedeResenar(b)}
          onBack={volver}
          onCancel={() => void cancelWithConfirmation(b)}
          onPay={() => void pagar(b)}
          onVerify={() => goTo(router, AppRoutes.pagoDeReserva(b.id))}
          onReview={() => resenar(b)}
          onSeePlan={(planId) => router.push(AppRoutes.plan(planId) as Href)}
        />
        <Snackbar />
        {dialog}
        {paymentModal}
      </View>
    );
  }
  if (vm.error !== null) {
    return marco(
      <EmptyState
        icon="cloud_off_rounded"
        title="No pudimos cargar la reserva"
        message={vm.error}
        action={<FilledButton variant="tonal" text="Reintentar" onPress={() => void cargar()} style={estilos.centro} />}
      />,
    );
  }
  return marco(
    <ScrollView contentContainerStyle={AppInsets.content} scrollEnabled={false}>
      <Skeleton height={190} radius={20} />
      <View style={{ height: 16 }} />
      <Skeleton height={28} width={220} />
      <View style={{ height: 12 }} />
      <Skeleton height={120} radius={20} />
    </ScrollView>,
  );
}

const estilos = StyleSheet.create({
  flex: { flex: 1 },
  centro: { alignSelf: 'center' },
});
