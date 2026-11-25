import { StyleSheet, View, type ViewStyle } from 'react-native';

import type { Booking } from '@/core';
import { Text } from '@/ui/components';
import { AppRadios, AppText, Sombras, useTheme } from '@/ui/theme';

import { FotoReserva } from './FotoReserva';
import { ChipCodigo, EstadoReservaPill } from './Insignias';

const ALTURA = 132;

/**
 * `LinearGradient` negro 38 % → transparente (stops 0 / .55) con `backgroundImage`, estable en
 * React Native 0.88 (`experimental_backgroundImage` queda solo como alias); sirve igual en web.
 */
const CSS_DEGRADADO = 'linear-gradient(to bottom, rgba(0,0,0,0.38) 0%, rgba(0,0,0,0) 55%)';
const DEGRADADO: ViewStyle = { backgroundImage: CSS_DEGRADADO };

/** Meses de la insignia: lista fija en mayúsculas sin punto. */
const MESES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'] as const;

/**
 * Cabecera de la tarjeta (`EncabezadoReserva`): foto (o respaldo) con un degradado arriba para que
 * la insignia de fecha y la píldora de estado, ambas sólidas, se lean sobre cualquier imagen; el
 * código de la reserva va abajo a la izquierda.
 */
export function EncabezadoReserva({ booking, apagado }: { booking: Booking; apagado: boolean }) {
  const fecha = booking.planDate?.date ?? booking.departureAt;
  return (
    <View testID="encabezado-reserva" style={estilos.cabecera}>
      <FotoReserva booking={booking} apagado={apagado} />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, DEGRADADO]} />
      {fecha ? (
        <View style={estilos.arribaIzquierda}>
          <InsigniaFecha fecha={fecha} />
        </View>
      ) : null}
      <View style={estilos.arribaDerecha}>
        <EstadoReservaPill booking={booking} />
      </View>
      <View style={estilos.abajo}>
        <ChipCodigo codigo={booking.code} sobreFoto />
      </View>
    </View>
  );
}

/** Día y mes de la salida en una insignia opaca (legible sobre cualquier foto). */
function InsigniaFecha({ fecha }: { fecha: Date }) {
  const cs = useTheme().colorScheme;
  return (
    <View testID="insignia-fecha" style={[estilos.insignia, Sombras.insignia, { backgroundColor: cs.surface }]}>
      <Text
        altura={1}
        style={{ fontSize: AppText.encabezadoL, fontWeight: '800', letterSpacing: -0.5, color: cs.primary }}
      >
        {String(fecha.getDate())}
      </Text>
      <View style={{ height: 3 }} />
      <Text style={{ fontSize: AppText.nota, fontWeight: '700', letterSpacing: 0.8, color: cs.onSurfaceVariant }}>
        {MESES[fecha.getMonth()]}
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  cabecera: { height: ALTURA, overflow: 'hidden' },
  arribaIzquierda: { position: 'absolute', top: 12, left: 12 },
  arribaDerecha: { position: 'absolute', top: 12, right: 12 },
  abajo: { position: 'absolute', left: 12, right: 12, bottom: 10, alignItems: 'flex-start' },
  insignia: { width: 52, paddingVertical: 6, borderRadius: AppRadios.field, alignItems: 'center' },
});
