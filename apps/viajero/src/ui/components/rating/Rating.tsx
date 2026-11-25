import { StyleSheet, View } from 'react-native';

import { AppRadii, AppText, withAlpha, useTheme } from '@/ui/theme';

import { Icono } from '../Icono';
import { Text } from '../Text';

/** Resumen «★ 4.8»: una estrella dorada (size+2) y, opcional, el valor con 1 decimal (size-1, w700). */
export function RatingStars({
  calificacion,
  size = 15,
  mostrarNumero = false,
}: {
  calificacion: number;
  size?: number;
  mostrarNumero?: boolean;
}) {
  const tema = useTheme();
  return (
    <View style={estilos.fila}>
      <Icono nombre="star_rounded" size={size + 2} color={tema.diverso.gold} />
      {mostrarNumero ? (
        <Text style={{ fontSize: size - 1, fontWeight: '700', color: tema.colorScheme.onSurface }}>
          {calificacion.toFixed(1)}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * Calificación de una reseña: cinco estrellas, llenas hasta [calificacion] (1 a 5). Para lectores
 * de pantalla es UN elemento: «N de 5 estrellas».
 */
export function EstrellasCalificacion({ calificacion, size = 15 }: { calificacion: number; size?: number }) {
  const tema = useTheme();
  return (
    <View accessible accessibilityLabel={`${calificacion} de 5 estrellas`} style={estilos.fila}>
      {[1, 2, 3, 4, 5].map((i) =>
        i <= calificacion ? (
          <Icono key={i} nombre="star_rounded" size={size} color={tema.diverso.gold} />
        ) : (
          <Icono key={i} nombre="star_outline_rounded" size={size} color={tema.colorScheme.outlineVariant} />
        ),
      )}
    </View>
  );
}

/** Píldora «Nueva» de lo que aún no tiene reseñas (planes y agencias). */
export function InsigniaNueva({ texto = 'Nueva' }: { texto?: string }) {
  const cs = useTheme().colorScheme;
  return (
    <View
      testID="insignia-nueva"
      style={[estilos.pildora, { backgroundColor: withAlpha(cs.primary, 0.1), paddingHorizontal: 8, paddingVertical: 2 }]}
    >
      <Text style={{ fontSize: AppText.label, fontWeight: '700', color: cs.primary }}>{texto}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' },
  pildora: { borderRadius: AppRadii.pill, alignSelf: 'flex-start' },
});
