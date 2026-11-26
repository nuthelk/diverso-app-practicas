import { useRouter } from 'expo-router';
import { useEffect, useRef, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useDependencies } from '@/composition';
import { goTo } from '@/features/checkout/go-to';
import { Snackbar, showSnackbar } from '@/features/shared/snackbar';
import { TopBar } from '@/features/shell/components/TopBar';
import { AppRoutes, safeGoBack } from '@/router';
import { CircularProgressIndicator, EmptyState, FilledButton, TextButton } from '@/ui/components';
import { useTheme } from '@/ui/theme';

import { ReviewForm } from '../components/ReviewForm';
import { returnResult, preloadedBooking } from '../between-screens';
import { useReviewViewModel } from '../view-models/useReviewViewModel';

export interface ReviewViewProps {
  bookingId: string;
}

/**
 * `/resena/:bookingId` (`ReviewLoader` + `ReviewView` de Flutter): carga la reserva por id, así
 * la pantalla se reconstruye igual tras recargar la página en web; la reserva adelantada por
 * «Mis reservas» o el detalle solo evita la espera. Si la reserva no se puede reseñar (aún no
 * viajó, ya reseñada, no confirmada) lo dice en vez de dejar escribir una reseña que el servidor
 * rechazaría. Al publicar avisa «¡Gracias!…», devuelve `true` a quien la abrió (el `pop(true)`)
 * y vuelve; abierta en frío, va a «Mis reservas».
 */
export function ReviewView({ bookingId }: ReviewViewProps) {
  const theme = useTheme();
  const router = useRouter();
  const { bookings, reviews } = useDependencies();
  const preloaded = useRef(preloadedBooking(bookingId)).current;
  const vm = useReviewViewModel({ bookings, reviews, bookingId, preloaded });
  const { load, submitError } = vm;

  useEffect(() => {
    void load();
  }, [load]);

  // Si el servidor la rechaza, el motivo va en un aviso (se puede reintentar).
  useEffect(() => {
    if (submitError !== null) showSnackbar(submitError);
  }, [submitError]);

  const submit = async (comment: string) => {
    if (!(await vm.submit(comment))) return;
    showSnackbar('¡Gracias! Tu reseña ayudará a otros viajeros.');
    returnResult(AppRoutes.review(bookingId), true);
    safeGoBack(router, AppRoutes.bookings);
  };

  const goToBookings = () => goTo(router, AppRoutes.bookings);

  let body: ReactNode;
  if (vm.loading) {
    body = (
      <View style={styles.center}>
        <CircularProgressIndicator />
      </View>
    );
  } else if (vm.error !== null) {
    body = (
      <EmptyState
        icon="cloud_off_rounded"
        title="No pudimos cargar la reserva"
        message={vm.error}
        action={
          <View style={styles.actions}>
            <FilledButton variant="tonal" text="Reintentar" onPress={() => void load()} />
            <TextButton text="Ver mis reservas" onPress={goToBookings} />
          </View>
        }
      />
    );
  } else if (!vm.canReview) {
    body = (
      <EmptyState
        icon="rate_review_outlined"
        title="Esta reserva no se puede reseñar"
        message="Solo se reseñan los viajes ya realizados que aún no tienen reseña."
        action={<FilledButton variant="tonal" text="Ver mis reservas" onPress={goToBookings} />}
      />
    );
  } else {
    body = <ReviewForm vm={vm} onSubmit={(comment) => void submit(comment)} />;
  }

  return (
    <View testID="pantalla-ReviewView" style={[styles.flex, { backgroundColor: theme.pageBackground }]}>
      <TopBar title="Tu reseña" onBack={() => safeGoBack(router, AppRoutes.bookings)} />
      <View style={styles.flex}>{body}</View>
      <Snackbar />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  actions: { alignItems: 'center' },
});
