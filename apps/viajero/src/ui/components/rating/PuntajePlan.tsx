import { StyleSheet, View } from 'react-native';

import type { Plan } from '@/core/models/plan';
import { AppText, useTheme } from '@/ui/theme';

import { Text } from '../Text';
import { InsigniaNueva, RatingStars } from './Rating';

/**
 * Puntaje de un plan: «Nueva» mientras no tenga reseñas (un 0.0 sería engañoso); si no,
 * ★ con el valor y «(n)» (tarjeta) o « · n reseñas verificadas» (ficha, [detallado]).
 */
export function PuntajePlan({
  plan,
  detallado = false,
}: {
  plan: Pick<Plan, 'isNew' | 'averageRating' | 'reviewsCount'>;
  detallado?: boolean;
}) {
  const cs = useTheme().colorScheme;
  if (plan.isNew) return <InsigniaNueva />;
  const suave = { fontSize: detallado ? AppText.detail : AppText.caption, color: cs.onSurfaceVariant };
  return (
    <View style={estilos.fila}>
      <RatingStars calificacion={plan.averageRating} mostrarNumero />
      {detallado ? (
        <Text style={suave}>{` · ${plan.reviewsCount} reseñas verificadas`}</Text>
      ) : (
        <>
          <View style={{ width: 3 }} />
          <Text style={suave}>{`(${plan.reviewsCount})`}</Text>
        </>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' },
});
