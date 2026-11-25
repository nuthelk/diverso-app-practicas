import { StyleSheet, View } from 'react-native';

import { formatCOP, sinCortes, type Booking } from '@/core';
import { FilledButton, Icono, Text, TextButton } from '@/ui/components';
import { AppInsets, AppRadios, AppText, conAlfa, useTheme } from '@/ui/theme';

/** «Ya tienes una reserva pendiente de pago para esta fecha (2 personas, $ 330.000). Vence a las 14:35.» */
export function textoReservaPendiente(reserva: Booking): string {
  const vence = reserva.venceAt;
  const hora = `${String(vence.getHours()).padStart(2, '0')}:${String(vence.getMinutes()).padStart(2, '0')}`;
  const personas = `${reserva.pax} ${reserva.pax === 1 ? 'persona' : 'personas'}`;
  return (
    'Ya tienes una reserva pendiente de pago para esta fecha ' +
    `(${personas}, ${formatCOP(reserva.montoTotal)}). Vence a las ${hora}.`
  );
}

/**
 * Aviso del checkout cuando el viajero ya tiene una reserva pendiente de pago para la fecha:
 * completarla, verificar un pago ya hecho o cancelarla y empezar de nuevo. [ocupado] bloquea los
 * tres botones.
 */
export function ReservaPendienteAviso({
  reserva,
  ocupado,
  onCompletar,
  onVerificar,
  onCancelar,
}: {
  reserva: Booking;
  ocupado: boolean;
  onCompletar: () => void;
  onVerificar: () => void;
  onCancelar: () => void;
}) {
  const cs = useTheme().colorScheme;
  return (
    <View style={[AppInsets.tarjetaAmplia, estilos.caja, { backgroundColor: cs.secondaryContainer }]}>
      <View style={estilos.fila}>
        <Icono nombre="hourglass_top_rounded" size={20} color={cs.onSecondaryContainer} />
        <View style={{ width: 10 }} />
        <Text altura={1.4} style={[estilos.texto, { fontSize: AppText.cuerpoChico, color: cs.onSecondaryContainer }]}>
          {sinCortes(textoReservaPendiente(reserva))}
        </Text>
      </View>
      <View style={{ height: 12 }} />
      <View style={estilos.botones}>
        <FilledButton variante="tonal" texto="Completar pago" onPress={ocupado ? null : onCompletar} />
        <TextButton texto="Ya pagué, verificar" onPress={ocupado ? null : onVerificar} />
        {/* `TextButton.styleFrom(foregroundColor: error)`: deshabilitado vuelve al onSurface 38 %. */}
        <TextButton accessibilityLabel="Cancelar y empezar de nuevo" onPress={ocupado ? null : onCancelar}>
          <Text style={[estilos.centrado, { color: ocupado ? conAlfa(cs.onSurface, 0.38) : cs.error }]}>
            Cancelar y empezar de nuevo
          </Text>
        </TextButton>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  caja: { borderRadius: AppRadios.card },
  fila: { flexDirection: 'row', alignItems: 'flex-start' },
  texto: { flex: 1, minWidth: 0 },
  // `Wrap(spacing: 8, runSpacing: 4)`: cada botón con su ancho propio.
  botones: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 8, rowGap: 4, alignItems: 'center' },
  centrado: { textAlign: 'center' },
});
