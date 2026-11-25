import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Booking } from '@/core';
import { AppRoutes } from '@/router';
import { FilledButton, Icono, Text, TextButton } from '@/ui/components';
import { AppInsets, AppText, useTheme } from '@/ui/theme';

import { Aparecer, EscalaElastica } from '../components/Aparecer';
import { CodigoReserva } from '../components/CodigoReserva';
import { DetalleViaje } from '../components/DetalleViaje';
import { ItinerarioConfirmado } from '../components/ItinerarioConfirmado';
import { irA } from '../ir-a';

/** Ancho máximo de la columna en pantallas anchas. */
const ANCHO_MAXIMO = 460;

/**
 * Confirmación inmediata con código e itinerario (Anexo 4: KPI < 5 min), cargada del backend por
 * id para sobrevivir a una recarga en web. Check con rebote y bloques que entran escalonados.
 */
export function BookingSuccessView({ booking }: { booking: Booking }) {
  const tema = useTheme();
  const cs = tema.colorScheme;
  const router = useRouter();
  const itinerario = booking.plan?.itinerary ?? [];

  return (
    <SafeAreaView testID="booking-success" style={[estilos.pantalla, { backgroundColor: tema.fondoPagina }]}>
      <ScrollView contentContainerStyle={[estilos.centro, AppInsets.pantalla]}>
        <View style={estilos.columna}>
          <EscalaElastica>
            <View style={[estilos.circulo, { backgroundColor: cs.primaryContainer }]}>
              <Icono nombre="check_rounded" size={46} color={cs.primary} />
            </View>
          </EscalaElastica>
          <View style={{ height: 20 }} />
          <Aparecer paso={0}>
            <Text
              accessibilityRole="header"
              style={[estilos.centrado, { fontSize: AppText.encabezado3xl, fontWeight: '800', letterSpacing: -0.8, color: cs.onSurface }]}
            >
              ¡Listo, nos vemos ahí!
            </Text>
            <View style={{ height: 6 }} />
            <Text style={[estilos.centrado, { fontSize: AppText.cuerpo, color: cs.onSurfaceVariant }]}>
              Tu reserva está confirmada y el cupo es tuyo.
            </Text>
          </Aparecer>
          <View style={{ height: 24 }} />
          <Aparecer paso={1}>
            <CodigoReserva codigo={booking.code} />
          </Aparecer>
          <View style={{ height: 14 }} />
          <Aparecer paso={2}>
            <DetalleViaje booking={booking} />
          </Aparecer>
          {itinerario.length > 0 ? (
            <>
              <View style={{ height: 14 }} />
              <Aparecer paso={3}>
                <ItinerarioConfirmado pasos={itinerario} />
              </Aparecer>
            </>
          ) : null}
          <View style={{ height: 24 }} />
          <FilledButton texto="Ver mis reservas" onPress={() => irA(router, AppRoutes.reservas)} />
          <View style={{ height: 8 }} />
          <TextButton texto="Seguir explorando" onPress={() => irA(router, AppRoutes.explorar)} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1 },
  // `Center` + `SingleChildScrollView`: centrado si cabe, con scroll si no.
  centro: { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
  columna: { width: '100%', maxWidth: ANCHO_MAXIMO },
  circulo: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center' },
  centrado: { textAlign: 'center' },
});
