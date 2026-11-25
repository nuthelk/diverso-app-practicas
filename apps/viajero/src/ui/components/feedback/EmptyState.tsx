import type { ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { AppInsets, AppText, withAlpha, monospaceFamily, useTheme } from '@/ui/theme';

import { Icon, type IconName } from '../Icon';
import { Text } from '../Text';

/**
 * Estado vacío, de error o 404: ícono en un círculo, título, mensaje, causa técnica opcional
 * (monospace, para soporte) y acción opcional.
 */
export function EmptyState({
  icon,
  title,
  message,
  details,
  action,
}: {
  icon: IconName;
  title: string;
  message: string;
  /** Causa técnica (excepción cruda) en pequeño. */
  details?: string | null;
  action?: ReactNode;
}) {
  const cs = useTheme().colorScheme;
  return (
    <View style={styles.center}>
      <View style={styles.column}>
        <View testID="empty-state-icono" style={[styles.circle, AppInsets.largeCard, { backgroundColor: cs.surfaceContainerHigh }]}>
          <Icon name={icon} size={30} color={cs.onSurfaceVariant} />
        </View>
        <View style={{ height: 16 }} />
        {/* Sin color propio: hereda el del texto por defecto, como en Flutter. */}
        <Text style={{ fontSize: AppText.largeSubtitle, fontWeight: '700', letterSpacing: -0.3 }}>{title}</Text>
        <View style={{ height: 5 }} />
        <Text
          height={1.45}
          style={[styles.message, { fontSize: AppText.smallBody, color: cs.onSurfaceVariant }]}
        >
          {message}
        </Text>
        {details != null ? (
          <>
            <View style={{ height: 8 }} />
            <Text
              testID="empty-state-detalle"
              height={1.35}
              style={[
                styles.details,
                {
                  fontSize: AppText.note,
                  fontFamily: Platform.OS === 'ios' ? monospaceFamily.ios : monospaceFamily.others,
                  color: withAlpha(cs.onSurfaceVariant, 0.75),
                },
              ]}
            >
              {details}
            </Text>
          </>
        ) : null}
        {action ? (
          <>
            <View style={{ height: 18 }} />
            {action}
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  column: { padding: 36, alignItems: 'center' },
  circle: { borderRadius: 999 },
  message: { maxWidth: 300, textAlign: 'center' },
  details: { maxWidth: 340, textAlign: 'center' },
});
