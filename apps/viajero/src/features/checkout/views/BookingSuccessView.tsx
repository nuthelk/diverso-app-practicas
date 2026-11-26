import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Booking } from '@/core';
import { AppRoutes } from '@/router';
import { FilledButton, Icon, Text, TextButton } from '@/ui/components';
import { AppInsets, AppText, useTheme } from '@/ui/theme';

import { Appear, ElasticScale } from '../components/Appear';
import { BookingCode } from '../components/BookingCode';
import { TripDetail } from '../components/TripDetail';
import { ConfirmedItinerary } from '../components/ConfirmedItinerary';
import { goTo } from '../go-to';

/** Ancho máximo de la columna en pantallas anchas. */
const MAX_WIDTH = 460;

/**
 * Confirmación inmediata con código e itinerario (Anexo 4: KPI < 5 min), cargada del backend por
 * id para sobrevivir a una recarga en web. Check con rebote y bloques que entran escalonados.
 */
export function BookingSuccessView({ booking }: { booking: Booking }) {
  const theme = useTheme();
  const cs = theme.colorScheme;
  const router = useRouter();
  const itinerary = booking.plan?.itinerary ?? [];

  return (
    <SafeAreaView testID="booking-success" style={[styles.screen, { backgroundColor: theme.pageBackground }]}>
      <ScrollView contentContainerStyle={[styles.center, AppInsets.screen]}>
        <View style={styles.column}>
          <ElasticScale>
            <View style={[styles.circle, { backgroundColor: cs.primaryContainer }]}>
              <Icon name="check_rounded" size={46} color={cs.primary} />
            </View>
          </ElasticScale>
          <View style={{ height: 20 }} />
          <Appear step={0}>
            <Text
              accessibilityRole="header"
              style={[styles.centered, { fontSize: AppText.heading3xl, fontWeight: '800', letterSpacing: -0.8, color: cs.onSurface }]}
            >
              ¡Listo, nos vemos ahí!
            </Text>
            <View style={{ height: 6 }} />
            <Text style={[styles.centered, { fontSize: AppText.body, color: cs.onSurfaceVariant }]}>
              Tu reserva está confirmada y el cupo es tuyo.
            </Text>
          </Appear>
          <View style={{ height: 24 }} />
          <Appear step={1}>
            <BookingCode code={booking.code} />
          </Appear>
          <View style={{ height: 14 }} />
          <Appear step={2}>
            <TripDetail booking={booking} />
          </Appear>
          {itinerary.length > 0 ? (
            <>
              <View style={{ height: 14 }} />
              <Appear step={3}>
                <ConfirmedItinerary steps={itinerary} />
              </Appear>
            </>
          ) : null}
          <View style={{ height: 24 }} />
          <FilledButton text="Ver mis reservas" onPress={() => goTo(router, AppRoutes.bookings)} />
          <View style={{ height: 8 }} />
          <TextButton text="Seguir explorando" onPress={() => goTo(router, AppRoutes.explore)} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  // `Center` + `SingleChildScrollView`: centrado si cabe, con scroll si no.
  center: { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
  column: { width: '100%', maxWidth: MAX_WIDTH },
  circle: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center' },
  centered: { textAlign: 'center' },
});
