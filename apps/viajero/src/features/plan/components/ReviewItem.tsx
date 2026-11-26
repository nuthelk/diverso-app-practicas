import { StyleSheet, View } from 'react-native';

import type { Review } from '@/core';
import { ReviewStars, Icon, Text } from '@/ui/components';
import { AppInsets, AppRadii, AppText, useTheme } from '@/ui/theme';

/** Primer grafema completo (no parte emojis); sin `Intl.Segmenter`, el primer punto de código. */
function firstCharacter(text: string): string {
  const Segmenter = (Intl as { Segmenter?: typeof Intl.Segmenter }).Segmenter;
  if (Segmenter) {
    const first = new Segmenter('es', { granularity: 'grapheme' }).segment(text)[Symbol.iterator]().next();
    if (!first.done) return first.value.segment;
  }
  return Array.from(text)[0] ?? '';
}

/**
 * Una reseña verificada de la ficha (`resena_item.dart`): avatar con la inicial, nombre,
 * estrellas, sello verificada y comentario. Nombre vacío o en blanco → «V» y «Viajero» (el
 * nombre de reseñas ajenas llega null por RLS: se mantiene, S5).
 */
export function ReviewItem({ review }: { review: Review }) {
  const cs = useTheme().colorScheme;
  const name = review.travelerName?.trim() ?? '';
  const comment = review.comment ?? '';
  return (
    <View testID="review-item" style={[styles.box, AppInsets.card, { backgroundColor: cs.surfaceContainerLow }]}>
      <View style={styles.row}>
        {/* CircleAvatar(radius 15) de M3: primaryContainer / onPrimaryContainer. */}
        <View testID="review-avatar" style={[styles.avatar, { backgroundColor: cs.primaryContainer }]}>
          <Text style={{ fontSize: AppText.detail, fontWeight: '700', color: cs.onPrimaryContainer }}>
            {name === '' ? 'V' : firstCharacter(name).toUpperCase()}
          </Text>
        </View>
        <View style={{ width: 9 }} />
        <Text style={{ flex: 1, fontWeight: '700', fontSize: AppText.smallBody }}>{name === '' ? 'Viajero' : review.travelerName}</Text>
        <ReviewStars rating={review.rating} size={14} />
        <View style={{ width: 5 }} />
        <View accessible accessibilityLabel="Reseña verificada: solo quien compró puede opinar">
          <Icon name="verified_rounded" size={14} color={cs.tertiary} />
        </View>
      </View>
      {comment !== '' ? (
        <Text height={1.45} style={{ marginTop: 10, fontSize: AppText.smallBody }}>
          {comment}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { marginBottom: 10, borderRadius: AppRadii.card },
  row: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
});
