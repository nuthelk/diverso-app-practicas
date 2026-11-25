import { StyleSheet, View } from 'react-native';

import { Icon, Text, type IconName } from '@/ui/components';
import { AppInsets, AppRadii, AppText, useTheme } from '@/ui/theme';

/**
 * Tarjeta informativa del perfil (`TarjetaInfo`): ícono en un círculo primaryContainer, título y
 * texto (compra protegida, tus datos).
 */
export function InfoCard({ icon, title, body }: { icon: IconName; title: string; body: string }) {
  const cs = useTheme().colorScheme;
  return (
    <View style={[styles.row, AppInsets.wideCard, { backgroundColor: cs.surfaceContainerLow, borderRadius: AppRadii.card }]}>
      <View style={[styles.circle, { backgroundColor: cs.primaryContainer }]}>
        <Icon name={icon} size={17} color={cs.onPrimaryContainer} />
      </View>
      <View style={{ width: 13 }} />
      <View style={styles.flex}>
        <Text style={{ fontWeight: '700', fontSize: AppText.body }}>{title}</Text>
        <View style={{ height: 4 }} />
        <Text height={1.5} style={{ fontSize: AppText.detail, color: cs.onSurfaceVariant }}>
          {body}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  circle: { padding: 9, borderRadius: 999 },
  flex: { flex: 1 },
});
