import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { BookingStatus, type Booking } from '@/core';
import { useDependencies } from '@/composition';
import { useOpenPayment } from '@/features/checkout/useOpenPayment';
import { goTo } from '@/features/checkout/go-to';
import { Snackbar } from '@/features/shared/snackbar';
import { TopBar } from '@/features/shell/components/TopBar';
import { AppRoutes } from '@/router';
import { EmptyState, FilledButton, Text, PageTitle } from '@/ui/components';
import { useTheme } from '@/ui/theme';

import { useBookingActions } from '../booking-actions';
import { BookingTabs } from '../components/BookingTabs';
import { BookingsSkeleton } from '../components/BookingsSkeleton';
import { BookingCard } from '../components/BookingCard';
import { preloadBooking, forgetPreloadedBooking, useOnReturn } from '../between-screens';
import { useBookingsViewModel } from '../view-models/useBookingsViewModel';

/**
 * Pestaña «Reservas» (`BookingsView`): próximas e historial con acciones de pago, reseña y
 * cancelación. El estado vive en `useBookingsViewModel` (MVVM).
 *
 * Conserva su estado al cambiar de pestaña (el shell no la desmonta: keep-alive). Al volver del
 * detalle o de la reseña SOLO se recarga si informan cambios (el detalle, «hubo cambios»; la reseña,
 * «publicada»), y en segundo plano: la lista sigue montada (sin esqueleto) y no pierde el
 * desplazamiento. En Flutter se recargaba siempre al volver de la reseña; esto es deliberado. Ver
 * `between-screens.ts`.
 */
export function BookingsView() {
  const theme = useTheme();
  const cs = theme.colorScheme;
  const router = useRouter();
  const { bookings, gateway } = useDependencies();
  const vm = useBookingsViewModel({ bookings });
  const { openPayment, paymentModal } = useOpenPayment(gateway);
  const { cancelWithConfirmation, completePayment, dialog } = useBookingActions(vm, openPayment);
  const onReturn = useOnReturn();
  const [tab, setTab] = useState(0);
  const { load, refresh } = vm;

  useEffect(() => {
    void load();
  }, [load]);

  // De vuelta en la lista, la reserva que se adelantó al detalle ya no hace falta.
  useFocusEffect(useCallback(() => forgetPreloadedBooking(), []));

  const openDetail = (b: Booking) => {
    preloadBooking(b);
    onReturn(AppRoutes.bookingDetail(b.id), (changed) => {
      if (changed === true) void refresh();
    });
    router.push(AppRoutes.bookingDetail(b.id) as Href);
  };

  const openReview = (b: Booking) => {
    preloadBooking(b);
    onReturn(AppRoutes.review(b.id), (published) => {
      if (published === true) void refresh();
    });
    router.push(AppRoutes.review(b.id) as Href);
  };

  const renderList = (tabBookings: Booking[], isHistory: boolean) => (
    <FlatList
      testID="bookings-list"
      data={tabBookings}
      keyExtractor={(b) => b.id}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={false} onRefresh={() => void load()} colors={[cs.primary]} tintColor={cs.primary} />}
      renderItem={({ item: b }) => {
        const isPending = b.status === BookingStatus.pendingPayment;
        return (
          <BookingCard
            booking={b}
            isHistory={isHistory}
            onOpen={() => openDetail(b)}
            onReview={vm.canReview(b) ? () => openReview(b) : null}
            onPay={isPending ? () => void completePayment(b) : null}
            onVerify={isPending ? () => goTo(router, AppRoutes.paymentForBooking(b.id)) : null}
            onCancel={vm.canCancel(b) ? () => void cancelWithConfirmation(b) : null}
          />
        );
      }}
    />
  );

  const body = vm.loading ? (
    <BookingsSkeleton />
  ) : vm.error !== null ? (
    <EmptyState
      icon="cloud_off_rounded"
      title="Sin conexión"
      message={vm.error}
      action={<FilledButton variant="tonal" text="Reintentar" onPress={() => void load()} style={styles.action} />}
    />
  ) : vm.bookings.length === 0 ? (
    <EmptyState
      icon="luggage_rounded"
      title="Aún no tienes reservas"
      message="Cuando reserves un plan, aquí verás tu código, la fecha y el itinerario."
    />
  ) : tab === 0 && vm.upcoming.length === 0 ? (
    // Sin viajes próximos: en vez de una línea suelta, invita a ir a «Explorar» (pestaña que ya
    // existe: `navigate`, no se apila otra encima).
    <EmptyState
      icon="explore_rounded"
      title="Sin viajes próximos"
      message="¡Hora de explorar!"
      action={
        <FilledButton
          variant="tonal"
          text="Explorar planes"
          onPress={() => router.navigate(AppRoutes.explore as Href)}
          style={styles.action}
        />
      }
    />
  ) : tab === 0 ? (
    renderList(vm.upcoming, false)
  ) : vm.history.length === 0 ? (
    <ScrollView contentContainerStyle={styles.empty}>
      <Text style={{ color: cs.onSurfaceVariant, textAlign: 'center' }}>Todavía no hay historial.</Text>
    </ScrollView>
  ) : (
    renderList(vm.history, true)
  );

  return (
    <View testID="screen-BookingsView" style={[styles.flex, { backgroundColor: theme.pageBackground }]}>
      {/* AppBar + pestañas fuera del área de la lista: las tarjetas no pueden pasar por encima. */}
      <TopBar title={<PageTitle text="Mis reservas" />} />
      <BookingTabs
        tabs={[`Próximas (${vm.upcoming.length})`, `Historial (${vm.history.length})`]}
        selected={tab}
        onChange={setTab}
      />
      <View style={styles.flex}>{body}</View>
      <Snackbar aboveBottomBar />
      {dialog}
      {paymentModal}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { paddingLeft: 20, paddingTop: 12, paddingRight: 20, paddingBottom: 24 },
  empty: { paddingTop: 120, paddingHorizontal: 20, alignItems: 'center' },
  action: { alignSelf: 'center' },
});
