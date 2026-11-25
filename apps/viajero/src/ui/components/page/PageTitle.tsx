import type { TextStyle } from 'react-native';

import { AppText, useTheme, type ColorScheme } from '@/ui/theme';

import { Text } from '../Text';

/** `TituloPagina.estilo(cs)`: 28 w800 ls -1 onSurface (la altura 1.1 va con `height`). */
export function pageTitleStyle(cs: ColorScheme): TextStyle {
  return { fontSize: AppText.pageTitle, fontWeight: '800', letterSpacing: -1, color: cs.onSurface };
}

/** Título de pestaña (Explorar, Agencias, Reservas, Perfil): grande, una línea, encabezado. */
export function PageTitle({ text }: { text: string }) {
  const cs = useTheme().colorScheme;
  return (
    <Text
      accessibilityRole="header"
      numberOfLines={1}
      ellipsizeMode="tail"
      height={1.1}
      style={pageTitleStyle(cs)}
    >
      {text}
    </Text>
  );
}
