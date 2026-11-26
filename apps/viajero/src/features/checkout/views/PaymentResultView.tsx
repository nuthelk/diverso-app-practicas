import { useRouter } from 'expo-router';
import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useDependencies } from '@/composition';
import { BookingStatus, VerifiedPaymentStatus, type DiversoError, type VerifiedPayment } from '@/core';
import { TopBar } from '@/features/shell/components/TopBar';
import { AppRoutes, safeGoBack } from '@/router';
import { CircularProgressIndicator, EmptyState, FilledButton, Text, TextButton } from '@/ui/components';
import { useTheme } from '@/ui/theme';

import { goTo } from '../go-to';
import { useOpenPayment } from '../useOpenPayment';
import { usePaymentResultViewModel, type PaymentResultViewModel } from '../view-models/usePaymentResultViewModel';

export interface PaymentResultViewProps {
  /** `?id=`: transacción de Wompi (vuelta del checkout). */
  transactionId: string | null;
  /** `?reserva=`: «Ya pagué, verificar» de una reserva. */
  bookingId: string | null;
}

/**
 * `/pago/resultado`: destino de la redirección de Wompi (`?id=<transacción>`) o del «Ya pagué,
 * verificar» (`?reserva=<id>`). Verifica en el servidor (nunca da por pagado por la redirección) y
 * lleva a la confirmación (`/reserva/:id`) si el pago fue aprobado. Sin datos, a Mis reservas.
 */
export function PaymentResultView({ transactionId, bookingId }: PaymentResultViewProps) {
  const theme = useTheme();
  const router = useRouter();
  const { gateway } = useDependencies();
  const vm = usePaymentResultViewModel({ gateway }, { transactionId, bookingId });
  const { openPayment, paymentModal } = useOpenPayment(gateway);

  useEffect(() => {
    // `addPostFrameCallback` de Dart: tras el primer pintado.
    if (vm.noData) goTo(router, AppRoutes.bookings);
    else void vm.verify();
  }, []);

  // El listener de Dart: aprobado y ya sin cargar → confirmación.
  const approvedBookingId = !vm.loading && vm.result?.status === VerifiedPaymentStatus.approved ? vm.result.bookingId : null;
  useEffect(() => {
    if (approvedBookingId !== null) goTo(router, AppRoutes.booking(approvedBookingId));
  }, [approvedBookingId, router]);

  return (
    <View testID="screen-PaymentResultView" style={[styles.screen, { backgroundColor: theme.pageBackground }]}>
      <TopBar title="Resultado del pago" onBack={() => safeGoBack(router, AppRoutes.bookings)} />
      <Content vm={vm} goToBookings={() => goTo(router, AppRoutes.bookings)} retry={(id) => void vm.retryPayment(id, openPayment)} />
      {paymentModal}
    </View>
  );
}

function Content({
  vm,
  goToBookings,
  retry,
}: {
  vm: PaymentResultViewModel;
  goToBookings: () => void;
  retry: (bookingId: string) => void;
}) {
  if (vm.noData || vm.loading || vm.result?.status === VerifiedPaymentStatus.approved) {
    return (
      <View style={styles.center}>
        <CircularProgressIndicator />
        <View style={{ height: 16 }} />
        <Text style={styles.centered}>
          {vm.attempts > 1
            ? `Esperando a que Wompi confirme tu pago de prueba… (intento ${vm.attempts})`
            : 'Confirmando tu pago de prueba con Wompi…'}
        </Text>
      </View>
    );
  }
  if (vm.failure !== null) return <VerificationError failure={vm.failure} verify={() => void vm.verify()} goToBookings={goToBookings} />;
  return (
    <NotApprovedResult
      r={vm.result!}
      vm={vm}
      goToBookings={goToBookings}
      retry={retry}
    />
  );
}

function VerificationError({
  failure,
  verify,
  goToBookings,
}: {
  failure: DiversoError;
  verify: () => void;
  goToBookings: () => void;
}) {
  const isFinal = failure.approvedLate || failure.code === 'MONTO_NO_COINCIDE';
  return (
    <EmptyState
      icon={failure.approvedLate ? 'history_toggle_off_rounded' : 'error_outline_rounded'}
      title={failure.approvedLate ? 'Tu reserva había vencido' : 'No pudimos verificar el pago'}
      message={failure.userMessage}
      action={
        <Actions>
          {!isFinal ? <FilledButton text="Reintentar" onPress={verify} /> : null}
          <SeeBookingsButton primary={isFinal} onPress={goToBookings} />
        </Actions>
      }
    />
  );
}

function NotApprovedResult({
  r,
  vm,
  goToBookings,
  retry,
}: {
  r: VerifiedPayment;
  vm: PaymentResultViewModel;
  goToBookings: () => void;
  retry: (bookingId: string) => void;
}) {
  const isPending = r.status === VerifiedPaymentStatus.pending;
  const canRetry = !isPending && r.bookingStatus === BookingStatus.pendingPayment;
  const message = isPending
    ? 'Todavía no recibimos la confirmación de Wompi. Te avisaremos en Mis reservas cuando llegue.'
    : r.bookingStatus === BookingStatus.pendingPayment
      ? r.userMessage
      : `${r.userMessage} Tu reserva ya no está vigente; vuelve a reservar.`;
  return (
    <EmptyState
      icon={isPending ? 'hourglass_top_rounded' : 'credit_card_off_rounded'}
      title={isPending ? 'Pago pendiente' : 'El pago no se completó'}
      message={message}
      details={vm.retryError}
      action={
        <Actions>
          {canRetry ? (
            <FilledButton
              text="Intentar de nuevo"
              onPress={vm.retryingPayment ? null : () => retry(r.bookingId)}
            />
          ) : null}
          {isPending ? <FilledButton text="Verificar de nuevo" onPress={() => void vm.verify()} /> : null}
          <SeeBookingsButton primary={!canRetry && !isPending} onPress={goToBookings} />
        </Actions>
      }
    />
  );
}

function SeeBookingsButton({ primary, onPress }: { primary: boolean; onPress: () => void }) {
  return primary ? (
    <FilledButton text="Ver mis reservas" onPress={onPress} />
  ) : (
    <TextButton text="Ver mis reservas" onPress={onPress} />
  );
}

/** Botones apilados con 8 de separación (cada uno con su ancho propio, centrados). */
function Actions({ children }: { children: ReactNode }) {
  const buttons = (Array.isArray(children) ? children : [children]).filter(Boolean);
  return (
    <View style={styles.actions}>
      {buttons.map((b, i) => (
        <View key={i} style={{ paddingBottom: 8 }}>
          {b}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centered: { textAlign: 'center' },
  actions: { alignItems: 'center' },
});
