import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { BackHandler, ScrollView, StyleSheet, View } from 'react-native';

import type { Booking } from '@/core';
import { useDependencies } from '@/composition';
import { goTo } from '@/features/checkout/go-to';
import { useOpenPayment } from '@/features/checkout/useOpenPayment';
import { Snackbar } from '@/features/shared/snackbar';
import { TopBar } from '@/features/shell/components/TopBar';
import { AppRoutes, safeGoBack } from '@/router';
import { EmptyState, FilledButton, Skeleton } from '@/ui/components';
import { AppInsets, useTheme } from '@/ui/theme';

import { useBookingActions } from '../booking-actions';
import { BookingDetail } from '../components/BookingDetail';
import { preloadBooking, returnResult, preloadedBooking, useOnReturn } from '../between-screens';
import { useBookingDetailViewModel } from '../view-models/useBookingDetailViewModel';

export interface BookingDetailViewProps {
  bookingId: string;
}

/**
 * `/reservas/:bookingId` (`ReservaDetalleView`): detalle de una reserva propia (estado, salida,
 * punto de encuentro, pago, itinerario, política y acciones). Si «Mis reservas» adelantó la
 * reserva se pinta de inmediato; sin ella (recarga en web, enlace directo) se carga por id.
 *
 * «Resultado al volver» (el `pop(cambio)` de Flutter): en cuanto hay un cambio (cancelación,
 * aunque el servidor la rechace; pago; reseña) se deja `true` para la lista con
 * `returnResult`; así vale también para el gesto atrás de iOS. El botón atrás de Android
 * (el `PopScope(canPop: false)`) pasa por el mismo «Volver»: sin pantalla previa lleva a «Mis
 * reservas» en vez de salir de la app.
 */
export function BookingDetailView({ bookingId }: BookingDetailViewProps) {
  const theme = useTheme();
  const router = useRouter();
  const { bookings, gateway } = useDependencies();
  const initial = useRef(preloadedBooking(bookingId)).current;
  const vm = useBookingDetailViewModel({ bookings, bookingId, initial });
  const { openPayment, paymentModal } = useOpenPayment(gateway);
  const { cancelWithConfirmation, completePayment, dialog } = useBookingActions(vm, openPayment);
  const onReturn = useOnReturn();
  const { load, changed, paymentAttempted, reviewPublished } = vm;
  const mounted = useRef(true);
  const ownRoute = AppRoutes.bookingDetail(bookingId);

  useEffect(() => {
    mounted.current = true;
    if (initial === null) void load();
    return () => {
      mounted.current = false;
    };
    // Solo al montar (el `initState` de Flutter).
  }, []);

  useEffect(() => {
    if (changed) returnResult(ownRoute, true);
  }, [changed, ownRoute]);

  const goBack = useCallback(() => safeGoBack(router, AppRoutes.bookings), [router]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        goBack();
        return true;
      });
      return () => subscription.remove();
    }, [goBack]),
  );

  const pay = async (b: Booking) => {
    await completePayment(b);
    if (mounted.current) await paymentAttempted();
  };

  const openReview = (b: Booking) => {
    preloadBooking(b);
    onReturn(AppRoutes.review(b.id), (reviewed) => {
      if (reviewed === true) reviewPublished();
    });
    router.push(AppRoutes.review(b.id) as Href);
  };

  /** Marco de las pantallas sin reserva (cargando / error): barra con «Volver». */
  const frame = (body: ReactNode) => (
    <View testID="screen-BookingDetailView" style={[styles.flex, { backgroundColor: theme.pageBackground }]}>
      <TopBar title={null} onBack={goBack} />
      <View style={styles.flex}>{body}</View>
      <Snackbar />
    </View>
  );

  const b = vm.booking;
  if (b !== null) {
    return (
      <View testID="screen-BookingDetailView" style={styles.flex}>
        <BookingDetail
          booking={b}
          canCancel={vm.canCancel(b)}
          canReview={vm.canReview(b)}
          onBack={goBack}
          onCancel={() => void cancelWithConfirmation(b)}
          onPay={() => void pay(b)}
          onVerify={() => goTo(router, AppRoutes.paymentForBooking(b.id))}
          onReview={() => openReview(b)}
          onSeePlan={(planId) => router.push(AppRoutes.plan(planId) as Href)}
        />
        <Snackbar />
        {dialog}
        {paymentModal}
      </View>
    );
  }
  if (vm.error !== null) {
    return frame(
      <EmptyState
        icon="cloud_off_rounded"
        title="No pudimos cargar la reserva"
        message={vm.error}
        action={<FilledButton variant="tonal" text="Reintentar" onPress={() => void load()} style={styles.center} />}
      />,
    );
  }
  return frame(
    <ScrollView contentContainerStyle={AppInsets.content} scrollEnabled={false}>
      <Skeleton height={190} radius={20} />
      <View style={{ height: 16 }} />
      <Skeleton height={28} width={220} />
      <View style={{ height: 12 }} />
      <Skeleton height={120} radius={20} />
    </ScrollView>,
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignSelf: 'center' },
});
