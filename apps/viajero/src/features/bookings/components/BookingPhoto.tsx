import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { EMOJI_EXPERIENCE_CATEGORY, type Booking } from '@/core';
import { Icon, Text } from '@/ui/components';
import { AppText, useTheme } from '@/ui/theme';

/**
 * Historial: la foto pierde color para que las próximas destaquen. Flutter aplica una
 * `ColorFilter.matrix` (.55 .35 .10 / .20 .70 .10 / .20 .35 .45) que conserva los grises y quita
 * más de la mitad del color: `saturate(.45)` es su equivalente más cercano en RN (Android 12+ y
 * web; iOS ignora `filter` y la deja a color).
 */
const dimmedStyle: ViewStyle = { filter: [{ saturate: 0.45 }] };

/**
 * Foto del plan (`FotoReserva`) o un respaldo de color con el emoji de la categoría (o una
 * maleta si no hay plan). [dimmed] le quita color (historial). Llena a su contenedor.
 */
export function BookingPhoto({ booking, dimmed = false }: { booking: Booking; dimmed?: boolean }) {
  const cs = useTheme().colorScheme;
  const plan = booking.plan;
  const photo = plan?.mainPhoto ?? null;
  const [failed, setFailed] = useState(false);

  const fallback = (testID?: string) => (
    <View testID={testID} style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: cs.primaryContainer }]}>
      {plan === null ? (
        <Icon name="luggage_rounded" size={40} color={cs.onPrimaryContainer} />
      ) : (
        <Text style={{ fontSize: AppText.photoEmoji }}>{EMOJI_EXPERIENCE_CATEGORY[plan.category]}</Text>
      )}
    </View>
  );

  const background =
    photo === null ? (
      fallback('sin-foto-reserva')
    ) : failed ? (
      fallback()
    ) : (
      <Image
        testID="foto-reserva"
        source={{ uri: photo }}
        contentFit="cover"
        style={StyleSheet.absoluteFill}
        onError={() => setFailed(true)}
        accessible={false}
      />
    );

  return <View style={[StyleSheet.absoluteFill, dimmed ? dimmedStyle : null]}>{background}</View>;
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});
