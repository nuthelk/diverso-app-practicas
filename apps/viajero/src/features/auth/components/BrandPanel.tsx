import { StyleSheet, View } from 'react-native';

import { DiversoLogo, Text } from '@/ui/components';
import { AppText, withAlpha, useTheme } from '@/ui/theme';

/**
 * Panel de marca de las pantallas anchas: el colibrí grande (solo el ave, sin caja ni nombre) y la
 * promesa de Diverso sobre el color primario.
 */
export function BrandPanel() {
  const cs = useTheme().colorScheme;
  return (
    <View testID="panel-marca" style={[styles.panel, { backgroundColor: cs.primary }]}>
      <DiversoLogo size={120} color={cs.onPrimary} />
      <View style={{ height: 28 }} />
      <Text height={1.55} style={[styles.tagline, { fontSize: AppText.subtitle, color: withAlpha(cs.onPrimary, 0.85) }]}>
        Planes turísticos de agencias antioqueñas verificadas. Precio final desde el inicio, cupos reales y pago protegido.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { flex: 1, padding: 48, justifyContent: 'center', alignItems: 'flex-start' },
  tagline: { maxWidth: 380 },
});
