import { StyleSheet, View } from 'react-native';

import { formatCOP, formatFechaLarga, type Booking } from '@/core';
import { Divider, Icono, Text, type IconoNombre } from '@/ui/components';
import { AppInsets, AppRadios, AppText, useTheme } from '@/ui/theme';

/**
 * Detalle de la reserva confirmada: plan, fecha, personas, punto de encuentro, monto y referencia
 * del pago.
 */
export function DetalleViaje({ booking }: { booking: Booking }) {
  const cs = useTheme().colorScheme;
  const plan = booking.plan;
  const fecha = booking.planDate?.fecha ?? null;
  const pago = booking.pago;
  const puntoEncuentro = plan?.puntoEncuentro ?? '';
  return (
    <View style={[AppInsets.tarjetaGrande, estilos.caja, { backgroundColor: cs.surfaceContainerLow }]}>
      <Text altura={1.25} style={{ fontWeight: '700', fontSize: AppText.enfasisGrande }}>
        {plan?.titulo ?? 'Tu plan'}
      </Text>
      <View style={{ height: 12 }} />
      {fecha !== null ? <Fila icono="event_rounded" texto={formatFechaLarga(fecha)} /> : null}
      <Fila icono="group_rounded" texto={`${booking.pax} ${booking.pax === 1 ? 'persona' : 'personas'}`} />
      {puntoEncuentro !== '' ? <Fila icono="flag_rounded" texto={puntoEncuentro} /> : null}
      {/* `Divider(height: 22)`: 22 de alto con la línea al centro. */}
      <View style={estilos.divisor}>
        <Divider />
      </View>
      <Fila icono="payments_rounded" texto={formatCOP(booking.montoTotal)} />
      {pago !== null ? <Fila icono="receipt_rounded" texto={pago.textoReferencia} /> : null}
      <View style={{ height: 8 }} />
      <View style={estilos.fila}>
        <Icono nombre="verified_user_rounded" size={14} color={cs.tertiary} />
        <View style={{ width: 6 }} />
        <Text style={[estilos.flexible, { fontSize: AppText.leyenda, color: cs.onSurfaceVariant }]}>
          Compra protegida: reembolso según la política de cancelación.
        </Text>
      </View>
    </View>
  );
}

function Fila({ icono, texto }: { icono: IconoNombre; texto: string }) {
  const cs = useTheme().colorScheme;
  return (
    <View style={[estilos.fila, { paddingVertical: 4 }]}>
      <Icono nombre={icono} size={16} color={cs.onSurfaceVariant} />
      <View style={{ width: 10 }} />
      <Text style={[estilos.flexible, { fontSize: AppText.cuerpoChico }]}>{texto}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  caja: { borderRadius: AppRadios.card },
  fila: { flexDirection: 'row', alignItems: 'center' },
  flexible: { flex: 1, minWidth: 0 },
  divisor: { height: 22, justifyContent: 'center' },
});
