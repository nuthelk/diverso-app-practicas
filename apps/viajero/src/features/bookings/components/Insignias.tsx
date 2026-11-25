import { StyleSheet, View } from 'react-native';

import { BookingStatus, type Booking } from '@/core';
import { Text } from '@/ui/components';
import { AppRadios, AppText, Sombras, useTheme } from '@/ui/theme';

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
        { backgroundColor: sobreFoto ? tema.diverso.controlSobreFoto : cs.surfaceContainerHigh },
      ]}
    >
      <Text
        numberOfLines={1}
        ellipsizeMode="tail"
        style={{
          fontSize: AppText.etiqueta,
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
        return realizada ? [colores.estadoCerrada, 'Realizada'] : [colores.estadoConfirmada, 'Confirmada'];
      case BookingStatus.pendingPayment:
        return [colores.estadoPendiente, 'Pendiente'];
      case BookingStatus.cancelled:
        return [colores.estadoCancelada, 'Cancelada'];
      case BookingStatus.completed:
        return [colores.estadoCerrada, 'Completada'];
    }
  })();
  return (
    <View style={[estilos.pildora, Sombras.insignia, { backgroundColor: color }]}>
      <Text style={{ color: '#FFFFFF', fontSize: AppText.etiqueta, fontWeight: '700' }}>{texto}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  chip: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', flexShrink: 1 },
  pildora: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: AppRadios.pill, alignSelf: 'flex-start' },
});
