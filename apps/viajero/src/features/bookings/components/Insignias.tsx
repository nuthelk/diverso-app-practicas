import { StyleSheet, View } from 'react-native';

import { BookingStatus, type Booking } from '@/core';
import { Text } from '@/ui/components';
import { AppRadii, AppText, Shadows, useTheme } from '@/ui/theme';

/**
 * Código de la reserva como etiqueta discreta (`ChipCodigo`). [sobreFoto] usa un fondo oscuro casi
 * opaco para leerse sobre cualquier imagen.
 */
export function ChipCodigo({ codigo, sobreFoto = false }: { codigo: string; sobreFoto?: boolean }) {
  const tema = useTheme();
  const cs = tema.colorScheme;
  return (
    <View
      style={[
        estilos.chip,
        { backgroundColor: sobreFoto ? tema.diverso.controlOverPhoto : cs.surfaceContainerHigh },
      ]}
    >
      <Text
        numberOfLines={1}
        ellipsizeMode="tail"
        style={{
          fontSize: AppText.label,
          fontWeight: '700',
          letterSpacing: 0.4,
          color: sobreFoto ? '#FFFFFF' : cs.onSurfaceVariant,
        }}
      >
        {codigo}
      </Text>
    </View>
  );
}

/**
 * Estado de la reserva (`EstadoReservaPill`): píldora de color sólido con texto blanco (legible
 * sobre foto y sobre la página). Una confirmada que ya salió dice «Realizada» (solo etiqueta: el
 * estado no cambia). Se calcula con el reloj en cada render.
 */
export function EstadoReservaPill({ booking }: { booking: Booking }) {
  const colores = useTheme().diverso;
  const realizada = booking.status === BookingStatus.confirmed && booking.departure !== null && !booking.isUpcoming();
  const [color, texto] = (() => {
    switch (booking.status) {
      case BookingStatus.confirmed:
        return realizada ? [colores.statusClosed, 'Realizada'] : [colores.statusConfirmed, 'Confirmada'];
      case BookingStatus.pendingPayment:
        return [colores.statusPending, 'Pendiente'];
      case BookingStatus.cancelled:
        return [colores.statusCancelled, 'Cancelada'];
      case BookingStatus.completed:
        return [colores.statusClosed, 'Completada'];
    }
  })();
  return (
    <View style={[estilos.pildora, Shadows.badge, { backgroundColor: color }]}>
      <Text style={{ color: '#FFFFFF', fontSize: AppText.label, fontWeight: '700' }}>{texto}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  chip: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', flexShrink: 1 },
  pildora: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: AppRadii.pill, alignSelf: 'flex-start' },
});
