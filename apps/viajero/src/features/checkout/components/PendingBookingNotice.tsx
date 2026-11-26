import { StyleSheet, View } from 'react-native';

import { formatCOP, noLineBreaks, type Booking } from '@/core';
import { FilledButton, Icon, Text, TextButton } from '@/ui/components';
import { AppInsets, AppRadii, AppText, withAlpha, useTheme } from '@/ui/theme';

/** «Ya tienes una reserva pendiente de pago para esta fecha (2 personas, $ 330.000). Vence a las 14:35.» */
export function pendingBookingText(booking: Booking): string {
  const expires = booking.expiresAt;
  const time = `${String(expires.getHours()).padStart(2, '0')}:${String(expires.getMinutes()).padStart(2, '0')}`;
  const travelers = `${booking.pax} ${booking.pax === 1 ? 'persona' : 'personas'}`;
  return (
    'Ya tienes una reserva pendiente de pago para esta fecha ' +
    `(${travelers}, ${formatCOP(booking.totalAmount)}). Vence a las ${time}.`
  );
}

/**
 * Aviso del checkout cuando el viajero ya tiene una reserva pendiente de pago para la fecha:
 * completarla, verificar un pago ya hecho o cancelarla y empezar de nuevo. [busy] bloquea los
 * tres botones.
 */
export function PendingBookingNotice({
  booking,
  busy,
  onComplete,
  onVerify,
  onCancel,
}: {
  booking: Booking;
  busy: boolean;
  onComplete: () => void;
  onVerify: () => void;
  onCancel: () => void;
}) {
  const cs = useTheme().colorScheme;
  return (
    <View style={[AppInsets.wideCard, styles.box, { backgroundColor: cs.secondaryContainer }]}>
      <View style={styles.row}>
        <Icon name="hourglass_top_rounded" size={20} color={cs.onSecondaryContainer} />
        <View style={{ width: 10 }} />
        <Text height={1.4} style={[styles.text, { fontSize: AppText.smallBody, color: cs.onSecondaryContainer }]}>
          {noLineBreaks(pendingBookingText(booking))}
        </Text>
      </View>
      <View style={{ height: 12 }} />
      <View style={styles.buttons}>
        <FilledButton variant="tonal" text="Completar pago" onPress={busy ? null : onComplete} />
        <TextButton text="Ya pagué, verificar" onPress={busy ? null : onVerify} />
        {/* `TextButton.styleFrom(foregroundColor: error)`: deshabilitado vuelve al onSurface 38 %. */}
        <TextButton accessibilityLabel="Cancelar y empezar de nuevo" onPress={busy ? null : onCancel}>
          <Text style={[styles.centered, { color: busy ? withAlpha(cs.onSurface, 0.38) : cs.error }]}>
            Cancelar y empezar de nuevo
          </Text>
        </TextButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: AppRadii.card },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  text: { flex: 1, minWidth: 0 },
  // `Wrap(spacing: 8, runSpacing: 4)`: cada botón con su ancho propio.
  buttons: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 8, rowGap: 4, alignItems: 'center' },
  centered: { textAlign: 'center' },
});
