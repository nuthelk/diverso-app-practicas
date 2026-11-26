import { StyleSheet, View } from 'react-native';

import { noLineBreaks } from '@/core';
import { Icon, Text, type IconName } from '@/ui/components';
import { AppText, useTheme } from '@/ui/theme';

/**
 * Fila de dato con ícono (`FilaDato`): «📅 lun 27 oct · 06:00 · en 3 días». [accent] va al final,
 * en w700 primary. El texto se parte en varias líneas antes que desbordar. [color] tiñe texto e
 * ícono (por defecto, el del texto y onSurfaceVariant).
 */
export function InfoRow({
  icon,
  text,
  accent,
  color,
  compact = false,
}: {
  icon: IconName;
  text: string;
  accent?: string | null;
  color?: string;
  compact?: boolean;
}) {
  const cs = useTheme().colorScheme;
  const accentStyle = { fontWeight: '700' as const, color: cs.primary };
  return (
    <View style={styles.row}>
      <View style={styles.icon}>
        <Icon name={icon} size={compact ? 16 : 19} color={color ?? cs.onSurfaceVariant} />
      </View>
      <View style={{ width: compact ? 8 : 10 }} />
      <Text
        height={1.3}
        style={[styles.text, { fontSize: compact ? AppText.detail : AppText.largeBody, color: color ?? cs.onSurface }]}
      >
        {noLineBreaks(text)}
        {accent ? (
          <>
            <Text style={accentStyle}>{' · '}</Text>
            <Text style={accentStyle}>{accent}</Text>
          </>
        ) : null}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  icon: { paddingTop: 1 },
  text: { flex: 1 },
});
