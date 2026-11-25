import { createContext, useContext, useMemo, type ReactNode } from 'react';
import {
  Platform,
  StyleSheet,
  Text as RNText,
  type TextProps as RNTextProps,
  type TextStyle,
} from 'react-native';

import {
  resolveTextStyle,
  textTheme,
  useTheme,
  type BaseTextStyle,
  type TypographyStyleName,
  type PlatformName,
} from '@/ui/theme';

/** Estilo heredable (como `DefaultTextStyle` de Flutter). */
const StyleContext = createContext<BaseTextStyle | null>(null);

/**
 * Reemplaza la base que heredan los `Text` de adentro. Es lo que hacen en Flutter los botones,
 * chips o el título del AppBar: su estilo NO se mezcla con el bodyMedium (p.ej. altura natural y
 * sin letter-spacing). Los campos que no se pasan salen del texto por defecto del tema.
 */
export function DefaultTextStyle({
  style,
  children,
}: {
  style: Partial<BaseTextStyle>;
  children: ReactNode;
}) {
  const theme = useTheme();
  const value = useMemo<BaseTextStyle>(
    () => ({
      fontSize: style.fontSize ?? 14,
      fontWeight: style.fontWeight ?? '400',
      height: style.height === undefined ? null : style.height,
      letterSpacing: style.letterSpacing ?? 0,
      color: style.color ?? theme.textColor,
      fontFamily: style.fontFamily,
    }),
    [style.fontSize, style.fontWeight, style.height, style.letterSpacing, style.color, style.fontFamily, theme.textColor],
  );
  return <StyleContext.Provider value={value}>{children}</StyleContext.Provider>;
}

export interface TextProps extends RNTextProps {
  /** Estilo de la escala M3 (`Theme.of(context).textTheme.<variante>`). */
  variant?: TypographyStyleName;
  /**
   * `TextStyle.height` de Flutter: multiplicador del tamaño. `null` = altura natural de la
   * fuente. Sin definir: la heredada (1.43 del bodyMedium, o la de la variante).
   */
  height?: number | null;
}

const platform = Platform.OS as PlatformName;

/**
 * Texto base de la app (gotcha 1). Aplica lo que Flutter hereda a TODO texto: color
 * #1D1B20/#E6E0E9, Roboto 14, lineHeight ×1.43 y letterSpacing 0.25; un tamaño propio sigue
 * heredando la altura y el interletraje. Un `Text` anidado hereda del padre, como un TextSpan.
 */
export function Text({ variant, height, style, children, ...rest }: TextProps) {
  const theme = useTheme();
  const inherited = useContext(StyleContext);
  const base: BaseTextStyle = inherited ?? {
    ...textTheme.bodyMedium,
    color: theme.textColor,
  };
  const flat = (StyleSheet.flatten(style) ?? {}) as TextStyle;
  const resolved = resolveTextStyle({ base, variant, style: flat, height, platform });
  const forChildren: BaseTextStyle = {
    fontSize: resolved.fontSize,
    fontWeight: flat.fontWeight ?? (variant ? textTheme[variant].fontWeight : base.fontWeight),
    height: height !== undefined ? height : variant ? textTheme[variant].height : base.height,
    letterSpacing: resolved.letterSpacing ?? base.letterSpacing,
    color: (resolved.color as string | undefined) ?? base.color,
    fontFamily: flat.fontFamily ?? base.fontFamily,
  };
  return (
    <RNText {...rest} style={resolved}>
      <StyleContext.Provider value={forChildren}>{children}</StyleContext.Provider>
    </RNText>
  );
}
