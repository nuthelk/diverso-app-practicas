import { StyleSheet, View } from 'react-native';

import { AppRadii, AppText, withAlpha, useTheme } from '@/ui/theme';

import { Icon } from '../Icon';
import { Text } from '../Text';

/** Resumen «★ 4.8»: una estrella dorada (size+2) y, opcional, el valor con 1 decimal (size-1, w700). */
export function RatingStars({
  rating,
  size = 15,
  showNumber = false,
}: {
  rating: number;
  size?: number;
  showNumber?: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <Icon name="star_rounded" size={size + 2} color={theme.diverso.gold} />
      {showNumber ? (
        <Text style={{ fontSize: size - 1, fontWeight: '700', color: theme.colorScheme.onSurface }}>
          {rating.toFixed(1)}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * Calificación de una reseña: cinco estrellas, llenas hasta [rating] (1 a 5). Para lectores
 * de pantalla es UN elemento: «N de 5 estrellas».
 */
export function ReviewStars({ rating, size = 15 }: { rating: number; size?: number }) {
  const theme = useTheme();
  return (
    <View accessible accessibilityLabel={`${rating} de 5 estrellas`} style={styles.row}>
      {[1, 2, 3, 4, 5].map((i) =>
        i <= rating ? (
          <Icon key={i} name="star_rounded" size={size} color={theme.diverso.gold} />
        ) : (
          <Icon key={i} name="star_outline_rounded" size={size} color={theme.colorScheme.outlineVariant} />
        ),
      )}
    </View>
  );
}

/** Píldora «Nueva» de lo que aún no tiene reseñas (planes y agencias). */
export function NewBadge({ text = 'Nueva' }: { text?: string }) {
  const cs = useTheme().colorScheme;
  return (
    <View
      testID="insignia-nueva"
      style={[styles.pill, { backgroundColor: withAlpha(cs.primary, 0.1), paddingHorizontal: 8, paddingVertical: 2 }]}
    >
      <Text style={{ fontSize: AppText.label, fontWeight: '700', color: cs.primary }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' },
  pill: { borderRadius: AppRadii.pill, alignSelf: 'flex-start' },
});
