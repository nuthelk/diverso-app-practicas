import { StyleSheet, View, type ViewStyle } from 'react-native';

import type { Booking } from '@/core';
import { Text } from '@/ui/components';
import { AppRadii, AppText, Shadows, useTheme } from '@/ui/theme';

import { BookingPhoto } from './BookingPhoto';
import { CodeChip, BookingStatusPill } from './Badges';

const HEIGHT = 132;

/**
 * `LinearGradient` negro 38 % → transparente (stops 0 / .55) con `backgroundImage`, estable en
 * React Native 0.88 (`experimental_backgroundImage` queda solo como alias); sirve igual en web.
 */
const GRADIENT_CSS = 'linear-gradient(to bottom, rgba(0,0,0,0.38) 0%, rgba(0,0,0,0) 55%)';
const GRADIENT: ViewStyle = { backgroundImage: GRADIENT_CSS };

/** Meses de la insignia: lista fija en mayúsculas sin punto. */
const MONTHS = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'] as const;

/**
 * Cabecera de la tarjeta (`EncabezadoReserva`): foto (o respaldo) con un degradado arriba para que
 * la insignia de fecha y la píldora de estado, ambas sólidas, se lean sobre cualquier imagen; el
 * código de la reserva va abajo a la izquierda.
 */
export function BookingHeader({ booking, dimmed }: { booking: Booking; dimmed: boolean }) {
  const date = booking.planDate?.date ?? booking.departureAt;
  return (
    <View testID="encabezado-reserva" style={styles.header}>
      <BookingPhoto booking={booking} dimmed={dimmed} />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, GRADIENT]} />
      {date ? (
        <View style={styles.topLeft}>
          <DateBadge date={date} />
        </View>
      ) : null}
      <View style={styles.topRight}>
        <BookingStatusPill booking={booking} />
      </View>
      <View style={styles.bottom}>
        <CodeChip code={booking.code} onPhoto />
      </View>
    </View>
  );
}

/** Día y mes de la salida en una insignia opaca (legible sobre cualquier foto). */
function DateBadge({ date }: { date: Date }) {
  const cs = useTheme().colorScheme;
  return (
    <View testID="insignia-fecha" style={[styles.badge, Shadows.badge, { backgroundColor: cs.surface }]}>
      <Text
        height={1}
        style={{ fontSize: AppText.headingL, fontWeight: '800', letterSpacing: -0.5, color: cs.primary }}
      >
        {String(date.getDate())}
      </Text>
      <View style={{ height: 3 }} />
      <Text style={{ fontSize: AppText.note, fontWeight: '700', letterSpacing: 0.8, color: cs.onSurfaceVariant }}>
        {MONTHS[date.getMonth()]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { height: HEIGHT, overflow: 'hidden' },
  topLeft: { position: 'absolute', top: 12, left: 12 },
  topRight: { position: 'absolute', top: 12, right: 12 },
  bottom: { position: 'absolute', left: 12, right: 12, bottom: 10, alignItems: 'flex-start' },
  badge: { width: 52, paddingVertical: 6, borderRadius: AppRadii.field, alignItems: 'center' },
});
