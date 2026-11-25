import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, useTheme } from '@/ui/theme';

import { Text } from './Text';

/** Etiqueta de sección: pequeña, mayúsculas, espaciada (11.5 w700 ls 1.2 onSurfaceVariant). */
export function SectionLabel({ text, action }: { text: string; action?: ReactNode }) {
  const cs = useTheme().colorScheme;
  return (
    <View testID="section-label" style={styles.row}>
      <Text
        style={[
          styles.text,
          { fontSize: AppText.label, fontWeight: '700', letterSpacing: 1.2, color: cs.onSurfaceVariant },
        ]}
      >
        {text.toUpperCase()}
      </Text>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingBottom: 10 },
  text: { flex: 1 },
});
