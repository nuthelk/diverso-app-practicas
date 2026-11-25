import { StyleSheet, View } from 'react-native';

import { DiversoLogo, Text } from '@/ui/components';
import { AppText, conAlfa, useTheme } from '@/ui/theme';

/**
 * Panel de marca de las pantallas anchas: el colibrí grande y sin caja, el nombre y la promesa de
 * Diverso sobre el color primario.
 */
export function PanelMarca() {
  const cs = useTheme().colorScheme;
  return (
    <View testID="panel-marca" style={[estilos.panel, { backgroundColor: cs.primary }]}>
      <DiversoLogo size={120} color={cs.onPrimary} />
      <View style={{ height: 24 }} />
      <Text style={{ fontSize: AppText.marca, fontWeight: '800', letterSpacing: -1.5, color: cs.onPrimary }}>Diverso</Text>
      <View style={{ height: 12 }} />
      <Text altura={1.55} style={[estilos.promesa, { fontSize: AppText.subtitulo, color: conAlfa(cs.onPrimary, 0.85) }]}>
        Planes turísticos de agencias antioqueñas verificadas. Precio final desde el inicio, cupos reales y pago protegido.
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  panel: { flex: 1, padding: 48, justifyContent: 'center', alignItems: 'flex-start' },
  promesa: { maxWidth: 380 },
});
