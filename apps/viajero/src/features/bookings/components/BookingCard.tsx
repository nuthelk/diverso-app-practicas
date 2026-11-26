import { Pressable, StyleSheet, View } from 'react-native';

import { RefundStatus, formatCOP, type Booking } from '@/core';
import { Card, Divider, FilledButton, Icon, Text, TextButton } from '@/ui/components';
import { AppInsets, AppText, withAlpha, useTheme, type ColorScheme } from '@/ui/theme';

import { countdown, travelersText, departureText } from '../booking-format';
import { BookingHeader } from './BookingHeader';
import { InfoRow } from './InfoRow';

/** Color de la etiqueta de reembolso: rojo si fue rechazado, el primario en los demás casos. */
export function refundColor(b: Booking, cs: ColorScheme): string {
  return b.refund?.status === RefundStatus.rejected ? cs.error : cs.primary;
}

/**
 * Tarjeta de una reserva (`TarjetaReserva`), tocable (abre el detalle): foto del plan como
 * cabecera con la fecha de salida, el estado y el código encima; debajo el título y la agencia,
 * los datos que importan (salida con su cuenta regresiva y punto de encuentro), el reembolso, un
 * pie con personas y total, y las acciones. El historial se ve más apagado.
 *
 * Accesibilidad: la parte tocable se anuncia como botón «Ver detalle de la reserva {codigo}»; las
 * acciones quedan FUERA de ella (en RN un botón dentro de otro elemento accesible no se puede
 * enfocar con el lector de pantalla).
 */
export function BookingCard({
  booking,
  onOpen,
  isHistory = false,
  onReview,
  onCancel,
  onPay,
  onVerify,
}: {
  booking: Booking;
  onOpen: () => void;
  isHistory?: boolean;
  onReview?: (() => void) | null;
  onCancel?: (() => void) | null;
  onPay?: (() => void) | null;
  onVerify?: (() => void) | null;
}) {
  const theme = useTheme();
  const cs = theme.colorScheme;
  const agency = booking.plan?.agency?.name ?? null;
  const departure = departureText(booking);
  const meetingPoint = booking.plan?.meetingPoint ?? '';
  const textColor = isHistory ? withAlpha(cs.onSurface, 0.72) : cs.onSurface;
  const refundLabel = booking.refundLabel;
  const hasPayment = !!onPay || !!onVerify;
  const hasActions = !!onReview || !!onCancel;

  return (
    <View style={AppInsets.betweenCards}>
      <Card color={cs.surfaceContainerLow}>
        <Pressable
          onPress={onOpen}
          accessibilityRole="button"
          accessibilityLabel={`Ver detalle de la reserva ${booking.code}`}
        >
          {({ pressed }) => (
            <>
              <BookingHeader booking={booking} dimmed={isHistory} />
              <View style={styles.body}>
                <Text
                  numberOfLines={2}
                  ellipsizeMode="tail"
                  height={1.25}
                  style={{ fontWeight: '700', fontSize: AppText.subtitle, color: textColor }}
                >
                  {booking.plan?.title ?? 'Plan'}
                </Text>
                {agency !== null ? (
                  <>
                    <View style={{ height: 4 }} />
                    <View style={styles.row}>
                      <Icon name="storefront_outlined" size={14} color={cs.onSurfaceVariant} />
                      <View style={{ width: 5 }} />
                      <Text
                        numberOfLines={1}
                        ellipsizeMode="tail"
                        style={[styles.flex, { fontSize: AppText.largeCaption, fontWeight: '600', color: cs.onSurfaceVariant }]}
                      >
                        {agency}
                      </Text>
                    </View>
                  </>
                ) : null}
                <View style={{ height: 12 }} />
                {departure !== null ? (
                  <InfoRow icon="event_rounded" text={departure} accent={countdown(booking)} compact />
                ) : null}
                {meetingPoint.length > 0 ? (
                  <>
                    <View style={{ height: 6 }} />
                    <InfoRow icon="place_outlined" text={meetingPoint} compact />
                  </>
                ) : null}
                {refundLabel !== null ? (
                  <>
                    <View style={{ height: 6 }} />
                    <InfoRow
                      icon="currency_exchange_rounded"
                      text={refundLabel}
                      color={refundColor(booking, cs)}
                      compact
                    />
                  </>
                ) : null}
                <View style={{ height: 12 }} />
                <Divider color={cs.outlineVariant} />
                <View style={{ height: 12 }} />
                {/* Se parte en dos líneas con letra muy grande en vez de desbordar. */}
                <View style={styles.footer}>
                  <View style={styles.row}>
                    <Icon name="group_outlined" size={16} color={cs.onSurfaceVariant} />
                    <View style={{ width: 6 }} />
                    <Text style={{ fontSize: AppText.detail, color: cs.onSurfaceVariant }}>
                      {travelersText(booking.pax)}
                    </Text>
                  </View>
                  <Text
                    style={{ fontSize: AppText.largeSubtitle, fontWeight: '800', letterSpacing: -0.3, color: textColor }}
                  >
                    {formatCOP(booking.totalAmount)}
                  </Text>
                </View>
              </View>
              {pressed ? (
                <View
                  pointerEvents="none"
                  style={[StyleSheet.absoluteFill, { backgroundColor: withAlpha(cs.onSurface, theme.components.pressedOpacity) }]}
                />
              ) : null}
            </>
          )}
        </Pressable>
        {hasPayment || hasActions || booking.hasReview ? (
          <View style={styles.actions}>
            {hasPayment ? (
              <View style={[styles.wrap, { marginTop: 10 }]}>
                {onVerify ? <TextButton text="Ya pagué, verificar" onPress={onVerify} /> : null}
                {onPay ? (
                  <FilledButton variant="tonal" text="Completar pago" onPress={onPay} style={styles.button38} />
                ) : null}
              </View>
            ) : null}
            {hasActions ? (
              <View style={[styles.wrap, { marginTop: 10 }]}>
                {onReview ? (
                  <FilledButton
                    variant="tonal"
                    onPress={onReview}
                    accessibilityLabel="Reseñar"
                    style={[styles.button38, { paddingHorizontal: 14 }]}
                  >
                    <Icon name="star_outline_rounded" size={16} color={cs.onSecondaryContainer} />
                    <Text>Reseñar</Text>
                  </FilledButton>
                ) : null}
                {onCancel ? (
                  <TextButton onPress={onCancel} accessibilityLabel="Cancelar" style={styles.button38}>
                    <Text style={{ color: cs.error }}>Cancelar</Text>
                  </TextButton>
                ) : null}
              </View>
            ) : booking.hasReview ? (
              <View style={[styles.row, { marginTop: 8 }]}>
                <Icon name="rate_review_rounded" size={13} color={cs.primary} />
                <View style={{ width: 4 }} />
                <Text style={{ fontSize: AppText.caption, color: cs.primary }}>Ya dejaste tu reseña</Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { paddingLeft: 16, paddingRight: 16, paddingTop: 14, paddingBottom: 14 },
  row: { flexDirection: 'row', alignItems: 'center' },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    columnGap: 12,
    rowGap: 4,
  },
  // Las acciones siguen el cuerpo (14 abajo en Flutter van tras el pie: aquí debajo, mismo aire).
  actions: { paddingLeft: 16, paddingRight: 16, paddingBottom: 14, marginTop: -14 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', columnGap: 8, rowGap: 4 },
  button38: { minHeight: 38 },
});
