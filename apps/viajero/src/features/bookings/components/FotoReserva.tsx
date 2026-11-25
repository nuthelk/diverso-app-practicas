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
const apagadoEstilo: ViewStyle = { filter: [{ saturate: 0.45 }] };

/**
 * Foto del plan (`FotoReserva`) o un respaldo de color con el emoji de la categoría (o una
 * maleta si no hay plan). [apagado] le quita color (historial). Llena a su contenedor.
 */
export function FotoReserva({ booking, apagado = false }: { booking: Booking; apagado?: boolean }) {
  const cs = useTheme().colorScheme;
  const plan = booking.plan;
  const foto = plan?.mainPhoto ?? null;
  const [fallo, setFallo] = useState(false);

  const respaldo = (testID?: string) => (
    <View testID={testID} style={[StyleSheet.absoluteFill, estilos.centro, { backgroundColor: cs.primaryContainer }]}>
      {plan === null ? (
        <Icon name="luggage_rounded" size={40} color={cs.onPrimaryContainer} />
      ) : (
        <Text style={{ fontSize: AppText.photoEmoji }}>{EMOJI_EXPERIENCE_CATEGORY[plan.category]}</Text>
      )}
    </View>
  );

  const fondo =
    foto === null ? (
      respaldo('sin-foto-reserva')
    ) : fallo ? (
      respaldo()
    ) : (
      <Image
        testID="foto-reserva"
        source={{ uri: foto }}
        contentFit="cover"
        style={StyleSheet.absoluteFill}
        onError={() => setFallo(true)}
        accessible={false}
      />
    );

  return <View style={[StyleSheet.absoluteFill, apagado ? apagadoEstilo : null]}>{fondo}</View>;
}

const estilos = StyleSheet.create({
  centro: { alignItems: 'center', justifyContent: 'center' },
});
