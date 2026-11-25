import { StyleSheet, View } from 'react-native';

import type { Plan } from '@/core/models/plan';
import { AppText, useTheme } from '@/ui/theme';

import { Text } from '../Text';
import { NewBadge, RatingStars } from './Rating';

/**
 * Puntaje de un plan: «Nueva» mientras no tenga reseñas (un 0.0 sería engañoso); si no,
 * ★ con el valor y «(n)» (tarjeta) o « · n reseñas verificadas» (ficha, [detailed]).
 */
export function PlanScore({
  plan,
  detailed = false,
}: {
  plan: Pick<Plan, 'isNew' | 'averageRating' | 'reviewsCount'>;
  detailed?: boolean;
}) {
  const cs = useTheme().colorScheme;
  if (plan.isNew) return <NewBadge />;
  const mutedStyle = { fontSize: detailed ? AppText.detail : AppText.caption, color: cs.onSurfaceVariant };
  return (
    <View style={styles.row}>
      <RatingStars rating={plan.averageRating} showNumber />
      {detailed ? (
        <Text style={mutedStyle}>{` · ${plan.reviewsCount} reseñas verificadas`}</Text>
      ) : (
        <>
          <View style={{ width: 3 }} />
          <Text style={mutedStyle}>{`(${plan.reviewsCount})`}</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' },
});
