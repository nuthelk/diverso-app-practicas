import { View } from 'react-native';

import { formatCOP } from '@/core/utils/formatters';
import { AppText, useTheme } from '@/ui/theme';

import { Text } from '../Text';

const alignments = { start: 'flex-start', center: 'center', end: 'flex-end' } as const;

/**
 * Precio protagonista: `formatCOP(amount)` 21 w800 ls -0.5 onSurface + «por persona · precio
 * final» 10.5 onSurfaceVariant (en oscuro no puede quedar negro).
 */
export function PriceText({ amount, align = 'start' }: { amount: number; align?: keyof typeof alignments }) {
  const cs = useTheme().colorScheme;
  return (
    <View testID="price-text" style={{ alignItems: alignments[align] }}>
      <Text style={{ fontSize: AppText.headingM, fontWeight: '800', letterSpacing: -0.5, color: cs.onSurface }}>
        {formatCOP(amount)}
      </Text>
      <Text style={{ fontSize: AppText.micro, color: cs.onSurfaceVariant }}>por persona · precio final</Text>
    </View>
  );
}
