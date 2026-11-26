import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BookingStatus, formatCOP, type Booking } from '@/core';
import {
  CollapsibleHeader,
  FilledButton,
  Icon,
  OutlinedButton,
  ItineraryStepRow,
  SectionLabel,
  CancellationCard,
  Text,
  TextButton,
} from '@/ui/components';
import { AppInsets, AppRadii, AppText, withAlpha, useTheme } from '@/ui/theme';

import { countdown, travelersText, departureText } from '../booking-format';
import { InfoRow } from './InfoRow';
import { BookingPhoto } from './BookingPhoto';
import { CodeChip, BookingStatusPill } from './Badges';
import { refundColor } from './BookingCard';

interface ActionsProps {
  booking: Booking;
  canCancel: boolean;
  canReview: boolean;
  onCancel: () => void;
  onPay: () => void;
  onVerify: () => void;
  onReview: () => void;
  onSeePlan: (planId: string) => void;
}

/**
 * Detalle de una reserva (`DetalleReserva`): cabecera colapsable (240) con la foto, título,
 * agencia, estado y código, el resumen, el itinerario, la política de cancelación y las acciones.
 */
export function BookingDetail({ onBack, ...props }: ActionsProps & { onBack: () => void }) {
  const theme = useTheme();
  const cs = theme.colorScheme;
  const bottomInset = useSafeAreaInsets().bottom;
  const { booking } = props;
  const plan = booking.plan;
  const title = plan?.title ?? 'Plan';
  const agency = plan?.agency?.name ?? null;

  return (
    <CollapsibleHeader
      title={title}
      expandedHeight={240}
      onBack={onBack}
      background={<BookingPhoto booking={booking} />}
    >
      <View style={{ paddingLeft: 22, paddingRight: 22, paddingTop: 20, paddingBottom: 28 + bottomInset }}>
        <Text height={1.15} style={{ fontSize: AppText.headingXl, fontWeight: '800', letterSpacing: -0.7 }}>
          {title}
        </Text>
        {agency !== null ? (
          <View style={[styles.row, { marginTop: 8 }]}>
            <Icon name="storefront_outlined" size={16} color={cs.onSurfaceVariant} />
            <View style={{ width: 6 }} />
            <Text style={[styles.flex, { fontSize: AppText.body, fontWeight: '600', color: cs.onSurfaceVariant }]}>
              {agency}
            </Text>
          </View>
        ) : null}
        <View style={{ height: 14 }} />
        <View style={styles.wrap}>
          <BookingStatusPill booking={booking} />
          <CodeChip code={booking.code} />
        </View>
        <View style={{ height: 18 }} />
        <BookingSummary booking={booking} />
        {plan !== null && plan.itinerary.length > 0 ? (
          <>
            <View style={{ height: 24 }} />
            <SectionLabel text="Itinerario" />
            {plan.itinerary.map((step, i) => (
              <ItineraryStepRow key={i} step={step} isLast={i === plan.itinerary.length - 1} />
            ))}
          </>
        ) : null}
        {plan !== null && plan.cancellationPolicy.length > 0 ? (
          <>
            <View style={{ height: 8 }} />
            <CancellationCard text={plan.cancellationPolicy} />
          </>
        ) : null}
        <View style={{ height: 24 }} />
        <BookingDetailActions {...props} />
      </View>
    </CollapsibleHeader>
  );
}

/**
 * Datos de la reserva en el detalle (`ResumenReserva`): salida con su cuenta regresiva, punto de
 * encuentro, personas y total, pago y reembolso (las filas que no aplican no se dibujan).
 */
function BookingSummary({ booking }: { booking: Booking }) {
  const cs = useTheme().colorScheme;
  const departure = departureText(booking);
  const meetingPoint = booking.plan?.meetingPoint ?? '';
  const payment = booking.payment;
  const refundLabel = booking.refundLabel;
  return (
    <View style={[AppInsets.wideCard, { backgroundColor: cs.surfaceContainerLow, borderRadius: AppRadii.card }]}>
      {departure !== null ? (
        <>
          <InfoRow icon="event_rounded" text={departure} accent={countdown(booking)} />
          <View style={{ height: 12 }} />
        </>
      ) : null}
      {meetingPoint.length > 0 ? (
        <>
          <InfoRow icon="place_outlined" text={meetingPoint} />
          <View style={{ height: 12 }} />
        </>
      ) : null}
      <InfoRow icon="group_outlined" text={`${travelersText(booking.pax)} · ${formatCOP(booking.totalAmount)}`} />
      {payment !== null ? (
        <>
          <View style={{ height: 12 }} />
          <InfoRow icon="credit_card_rounded" text={payment.referenceText} />
        </>
      ) : null}
      {refundLabel !== null ? (
        <>
          <View style={{ height: 12 }} />
          <InfoRow icon="currency_exchange_rounded" text={refundLabel} color={refundColor(booking, cs)} />
        </>
      ) : null}
    </View>
  );
}

/**
 * Acciones al pie del detalle (`AccionesDetalleReserva`): completar o verificar el pago si sigue
 * pendiente, reseñar (o el aviso de que ya se reseñó), «Ver plan» y «Cancelar». Cada botón solo
 * aparece si aplica.
 */
function BookingDetailActions({
  booking,
  canCancel,
  canReview,
  onCancel,
  onPay,
  onVerify,
  onReview,
  onSeePlan,
}: ActionsProps) {
  const cs = useTheme().colorScheme;
  const planId = booking.plan?.id ?? booking.planDate?.planId ?? null;
  const isPending = booking.status === BookingStatus.pendingPayment;
  return (
    <View style={styles.column}>
      {isPending ? (
        <>
          <FilledButton text="Completar pago" onPress={onPay} style={styles.start} />
          <View style={{ height: 8 }} />
          <TextButton text="Ya pagué, verificar" onPress={onVerify} style={styles.start} />
          <View style={{ height: 8 }} />
        </>
      ) : null}
      {canReview ? (
        <>
          <FilledButton variant="tonal" icon="star_outline_rounded" text="Reseñar" onPress={onReview} style={styles.start} />
          <View style={{ height: 10 }} />
        </>
      ) : booking.hasReview ? (
        <>
          <View style={styles.row}>
            <Icon name="rate_review_rounded" size={15} color={cs.primary} />
            <View style={{ width: 6 }} />
            <Text style={{ fontSize: AppText.detail, color: cs.primary }}>Ya dejaste tu reseña</Text>
          </View>
          <View style={{ height: 10 }} />
        </>
      ) : null}
      <View style={styles.row}>
        {planId !== null ? (
          <OutlinedButton text="Ver plan" onPress={() => onSeePlan(planId)} style={styles.flex} />
        ) : null}
        {planId !== null && canCancel ? <View style={{ width: 10 }} /> : null}
        {canCancel ? (
          <OutlinedButton
            accessibilityLabel="Cancelar"
            onPress={onCancel}
            style={[styles.flex, { borderColor: withAlpha(cs.error, 0.5) }]}
          >
            <Text style={{ color: cs.error }}>Cancelar</Text>
          </OutlinedButton>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  column: { alignItems: 'stretch' },
  start: { alignSelf: 'flex-start' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 8, rowGap: 6 },
});
