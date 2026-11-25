import { StyleSheet, View } from 'react-native';

import { formatCOP, formatLongDate, type Booking } from '@/core';
import { Divider, Icon, Text, type IconName } from '@/ui/components';
import { AppInsets, AppRadii, AppText, useTheme } from '@/ui/theme';

/**
 * Detalle de la reserva confirmada: plan, fecha, personas, punto de encuentro, monto y referencia
 * del pago.
 */
export function DetalleViaje({ booking }: { booking: Booking }) {
  const cs = useTheme().colorScheme;
  const plan = booking.plan;
  const fecha = booking.planDate?.date ?? null;
  const pago = booking.payment;
  const puntoEncuentro = plan?.meetingPoint ?? '';
  return (
    <View style={[AppInsets.largeCard, estilos.caja, { backgroundColor: cs.surfaceContainerLow }]}>
      <Text height={1.25} style={{ fontWeight: '700', fontSize: AppText.largeEmphasis }}>
        {plan?.title ?? 'Tu plan'}
      </Text>
      <View style={{ height: 12 }} />
      {fecha !== null ? <Fila icono="event_rounded" texto={formatLongDate(fecha)} /> : null}
      <Fila icono="group_rounded" texto={`${booking.pax} ${booking.pax === 1 ? 'persona' : 'personas'}`} />
      {puntoEncuentro !== '' ? <Fila icono="flag_rounded" texto={puntoEncuentro} /> : null}
      {/* `Divider(height: 22)`: 22 de alto con la línea al centro. */}
      <View style={estilos.divisor}>
        <Divider />
      </View>
      <Fila icono="payments_rounded" texto={formatCOP(booking.totalAmount)} />
      {pago !== null ? <Fila icono="receipt_rounded" texto={pago.referenceText} /> : null}
      <View style={{ height: 8 }} />
      <View style={estilos.fila}>
        <Icon name="verified_user_rounded" size={14} color={cs.tertiary} />
        <View style={{ width: 6 }} />
        <Text style={[estilos.flexible, { fontSize: AppText.caption, color: cs.onSurfaceVariant }]}>
          Compra protegida: reembolso según la política de cancelación.
        </Text>
      </View>
    </View>
  );
}

function Fila({ icono, texto }: { icono: IconName; texto: string }) {
  const cs = useTheme().colorScheme;
  return (
    <View style={[estilos.fila, { paddingVertical: 4 }]}>
      <Icon name={icono} size={16} color={cs.onSurfaceVariant} />
      <View style={{ width: 10 }} />
      <Text style={[estilos.flexible, { fontSize: AppText.smallBody }]}>{texto}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  caja: { borderRadius: AppRadii.card },
  fila: { flexDirection: 'row', alignItems: 'center' },
  flexible: { flex: 1, minWidth: 0 },
  divisor: { height: 22, justifyContent: 'center' },
});
