import { StyleSheet, View } from 'react-native';

import { formatCOP, formatLongDate, type Booking } from '@/core';
import { Divider, Icon, Text, type IconName } from '@/ui/components';
import { AppInsets, AppRadii, AppText, useTheme } from '@/ui/theme';

/**
 * Detalle de la reserva confirmada: plan, fecha, personas, punto de encuentro, monto y referencia
 * del pago.
 */
export function TripDetail({ booking }: { booking: Booking }) {
  const cs = useTheme().colorScheme;
  const plan = booking.plan;
  const date = booking.planDate?.date ?? null;
  const payment = booking.payment;
  const meetingPoint = plan?.meetingPoint ?? '';
  return (
    <View style={[AppInsets.largeCard, styles.box, { backgroundColor: cs.surfaceContainerLow }]}>
      <Text height={1.25} style={{ fontWeight: '700', fontSize: AppText.largeEmphasis }}>
        {plan?.title ?? 'Tu plan'}
      </Text>
      <View style={{ height: 12 }} />
      {date !== null ? <Row icon="event_rounded" text={formatLongDate(date)} /> : null}
      <Row icon="group_rounded" text={`${booking.pax} ${booking.pax === 1 ? 'persona' : 'personas'}`} />
      {meetingPoint !== '' ? <Row icon="flag_rounded" text={meetingPoint} /> : null}
      {/* `Divider(height: 22)`: 22 de alto con la línea al centro. */}
      <View style={styles.divider}>
        <Divider />
      </View>
      <Row icon="payments_rounded" text={formatCOP(booking.totalAmount)} />
      {payment !== null ? <Row icon="receipt_rounded" text={payment.referenceText} /> : null}
      <View style={{ height: 8 }} />
      <View style={styles.row}>
        <Icon name="verified_user_rounded" size={14} color={cs.tertiary} />
        <View style={{ width: 6 }} />
        <Text style={[styles.flexible, { fontSize: AppText.caption, color: cs.onSurfaceVariant }]}>
          Compra protegida: reembolso según la política de cancelación.
        </Text>
      </View>
    </View>
  );
}

function Row({ icon, text }: { icon: IconName; text: string }) {
  const cs = useTheme().colorScheme;
  return (
    <View style={[styles.row, { paddingVertical: 4 }]}>
      <Icon name={icon} size={16} color={cs.onSurfaceVariant} />
      <View style={{ width: 10 }} />
      <Text style={[styles.flexible, { fontSize: AppText.smallBody }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: AppRadii.card },
  row: { flexDirection: 'row', alignItems: 'center' },
  flexible: { flex: 1, minWidth: 0 },
  divider: { height: 22, justifyContent: 'center' },
});
