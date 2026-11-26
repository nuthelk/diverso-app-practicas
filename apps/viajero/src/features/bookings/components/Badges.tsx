import { StyleSheet, View } from 'react-native';

import { BookingStatus, type Booking } from '@/core';
import { Text } from '@/ui/components';
import { AppRadii, AppText, Shadows, useTheme } from '@/ui/theme';

/**
 * Código de la reserva como etiqueta discreta (`ChipCodigo`). [onPhoto] usa un fondo oscuro casi
 * opaco para leerse sobre cualquier imagen.
 */
export function CodeChip({ code, onPhoto = false }: { code: string; onPhoto?: boolean }) {
  const theme = useTheme();
  const cs = theme.colorScheme;
  return (
    <View
      style={[
        styles.chip,
        { backgroundColor: onPhoto ? theme.diverso.controlOverPhoto : cs.surfaceContainerHigh },
      ]}
    >
      <Text
        numberOfLines={1}
        ellipsizeMode="tail"
        style={{
          fontSize: AppText.label,
          fontWeight: '700',
          letterSpacing: 0.4,
          color: onPhoto ? '#FFFFFF' : cs.onSurfaceVariant,
        }}
      >
        {code}
      </Text>
    </View>
  );
}

/**
 * Estado de la reserva (`EstadoReservaPill`): píldora de color sólido con texto blanco (legible
 * sobre foto y sobre la página). Una confirmada que ya salió dice «Realizada» (solo etiqueta: el
 * estado no cambia). Se calcula con el reloj en cada render.
 */
export function BookingStatusPill({ booking }: { booking: Booking }) {
  const colors = useTheme().diverso;
  const isDone = booking.status === BookingStatus.confirmed && booking.departure !== null && !booking.isUpcoming();
  const [color, text] = (() => {
    switch (booking.status) {
      case BookingStatus.confirmed:
        return isDone ? [colors.statusClosed, 'Realizada'] : [colors.statusConfirmed, 'Confirmada'];
      case BookingStatus.pendingPayment:
        return [colors.statusPending, 'Pendiente'];
      case BookingStatus.cancelled:
        return [colors.statusCancelled, 'Cancelada'];
      case BookingStatus.completed:
        return [colors.statusClosed, 'Completada'];
    }
  })();
  return (
    <View style={[styles.pill, Shadows.badge, { backgroundColor: color }]}>
      <Text style={{ color: '#FFFFFF', fontSize: AppText.label, fontWeight: '700' }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', flexShrink: 1 },
  pill: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: AppRadii.pill, alignSelf: 'flex-start' },
});
