import { View } from 'react-native';

import { formatCOP } from '@/core/utils/formatters';
import { AppText, useTheme } from '@/ui/theme';

import { Text } from '../Text';

const alineaciones = { start: 'flex-start', center: 'center', end: 'flex-end' } as const;

/**
 * Precio protagonista: `formatCOP(monto)` 21 w800 ls -0.5 onSurface + «por persona · precio
 * final» 10.5 onSurfaceVariant (en oscuro no puede quedar negro).
 */
export function PriceText({ monto, alineado = 'start' }: { monto: number; alineado?: keyof typeof alineaciones }) {
  const cs = useTheme().colorScheme;
  return (
    <View testID="price-text" style={{ alignItems: alineaciones[alineado] }}>
      <Text style={{ fontSize: AppText.headingM, fontWeight: '800', letterSpacing: -0.5, color: cs.onSurface }}>
        {formatCOP(monto)}
      </Text>
      <Text style={{ fontSize: AppText.micro, color: cs.onSurfaceVariant }}>por persona · precio final</Text>
    </View>
  );
}
