import { useRouter } from 'expo-router';
import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useDependencies } from '@/composition';
import { BookingStatus, noLineBreaks } from '@/core';
import { TopBar } from '@/features/shell/components/TopBar';
import { AppRoutes, volverSeguro } from '@/router';
import { CircularProgressIndicator, EmptyState, FilledButton } from '@/ui/components';
import { useTheme } from '@/ui/theme';

import { ZoomIn } from '../components/Appear';
import { goTo } from '../go-to';
import { useBookingConfirmationViewModel } from '../view-models/useBookingConfirmationViewModel';
import { BookingSuccessView } from './BookingSuccessView';

export interface BookingConfirmationViewProps {
  bookingId: string;
}

/**
 * `/reserva/:bookingId`: confirmación cargada del backend (entra con «zoom»). Si la reserva sigue
 * pendiente de pago se manda a verificar el pago; si está cancelada, lo dice.
 */
export function BookingConfirmationView({ bookingId }: BookingConfirmationViewProps) {
  const router = useRouter();
  const { reservas: bookings } = useDependencies();
  const vm = useBookingConfirmationViewModel({ bookings }, { bookingId });

  useEffect(() => {
    void vm.load();
  }, []);

  const booking = vm.booking;
  const pendingPaymentId = !vm.loading && booking?.status === BookingStatus.pendingPayment ? booking.id : null;
  useEffect(() => {
    if (pendingPaymentId !== null) goTo(router, AppRoutes.pagoDeReserva(pendingPaymentId));
  }, [pendingPaymentId, router]);

  const goToBookings = () => goTo(router, AppRoutes.reservas);

  let content: ReactNode;
  if (vm.loading) {
    content = <Frame><Loading /></Frame>;
  } else if (vm.error !== null || booking === null) {
    content = (
      <Frame>
        <EmptyState
          icon="cloud_off_rounded"
          title="No pudimos cargar la reserva"
          message={vm.error ?? ''}
          action={<FilledButton variant="tonal" text="Ver mis reservas" onPress={goToBookings} />}
        />
      </Frame>
    );
  } else {
    switch (booking.status) {
      case BookingStatus.confirmed:
      case BookingStatus.completed:
        content = <BookingSuccessView booking={booking} />;
        break;
      case BookingStatus.pendingPayment:
        content = <Frame><Loading /></Frame>;
        break;
      case BookingStatus.cancelled: {
        const refund = booking.refundLabel;
        content = (
          <Frame>
            <EmptyState
              icon="event_busy_rounded"
              title="Reserva cancelada"
              message={noLineBreaks(`La reserva ${booking.code} está cancelada.${refund === null ? '' : ` ${refund}.`}`)}
              action={<FilledButton variant="tonal" text="Ver mis reservas" onPress={goToBookings} />}
            />
          </Frame>
        );
        break;
      }
    }
  }
  return <ZoomIn testID="pantalla-ReservaView">{content}</ZoomIn>;
}

/** `Scaffold(AppBar())`: barra vacía con «Volver» (sin historial, a Mis reservas). */
function Frame({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const router = useRouter();
  return (
    <View style={[styles.screen, { backgroundColor: theme.pageBackground }]}>
      <TopBar title="" onBack={() => volverSeguro(router, AppRoutes.reservas)} />
      {children}
    </View>
  );
}

function Loading() {
  return (
    <View style={styles.center}>
      <CircularProgressIndicator />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
