import { StyleSheet, View } from 'react-native';

import type { Review } from '@/core';
import { ReviewStars, Icon, Text } from '@/ui/components';
import { AppInsets, AppRadii, AppText, useTheme } from '@/ui/theme';

/** Primer grafema completo (no parte emojis); sin `Intl.Segmenter`, el primer punto de código. */
function primerCaracter(texto: string): string {
  const Segmentador = (Intl as { Segmenter?: typeof Intl.Segmenter }).Segmenter;
  if (Segmentador) {
    const primero = new Segmentador('es', { granularity: 'grapheme' }).segment(texto)[Symbol.iterator]().next();
    if (!primero.done) return primero.value.segment;
  }
  return Array.from(texto)[0] ?? '';
}

/**
 * Una reseña verificada de la ficha (`resena_item.dart`): avatar con la inicial, nombre,
 * estrellas, sello verificada y comentario. Nombre vacío o en blanco → «V» y «Viajero» (el
 * nombre de reseñas ajenas llega null por RLS: se mantiene, S5).
 */
export function ResenaItem({ review }: { review: Review }) {
  const cs = useTheme().colorScheme;
  const nombre = review.travelerName?.trim() ?? '';
  const comentario = review.comment ?? '';
  return (
    <View testID="resena-item" style={[estilos.caja, AppInsets.card, { backgroundColor: cs.surfaceContainerLow }]}>
      <View style={estilos.fila}>
        {/* CircleAvatar(radius 15) de M3: primaryContainer / onPrimaryContainer. */}
        <View testID="avatar-resena" style={[estilos.avatar, { backgroundColor: cs.primaryContainer }]}>
          <Text style={{ fontSize: AppText.detail, fontWeight: '700', color: cs.onPrimaryContainer }}>
            {nombre === '' ? 'V' : primerCaracter(nombre).toUpperCase()}
          </Text>
        </View>
        <View style={{ width: 9 }} />
        <Text style={{ flex: 1, fontWeight: '700', fontSize: AppText.smallBody }}>{nombre === '' ? 'Viajero' : review.travelerName}</Text>
        <ReviewStars rating={review.rating} size={14} />
        <View style={{ width: 5 }} />
        <View accessible accessibilityLabel="Reseña verificada: solo quien compró puede opinar">
          <Icon name="verified_rounded" size={14} color={cs.tertiary} />
        </View>
      </View>
      {comentario !== '' ? (
        <Text height={1.45} style={{ marginTop: 10, fontSize: AppText.smallBody }}>
          {comentario}
        </Text>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  caja: { marginBottom: 10, borderRadius: AppRadii.card },
  fila: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
});
