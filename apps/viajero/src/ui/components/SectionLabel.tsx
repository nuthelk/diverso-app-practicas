import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, useTheme } from '@/ui/theme';

import { Text } from './Text';

/** Etiqueta de sección: pequeña, mayúsculas, espaciada (11.5 w700 ls 1.2 onSurfaceVariant). */
export function SectionLabel({ texto, accion }: { texto: string; accion?: ReactNode }) {
  const cs = useTheme().colorScheme;
  return (
    <View testID="section-label" style={estilos.fila}>
      <Text
        style={[
          estilos.texto,
          { fontSize: AppText.label, fontWeight: '700', letterSpacing: 1.2, color: cs.onSurfaceVariant },
        ]}
      >
        {texto.toUpperCase()}
      </Text>
      {accion}
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', paddingBottom: 10 },
  texto: { flex: 1 },
});
