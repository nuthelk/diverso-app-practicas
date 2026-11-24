import { createContext, useContext, useMemo, type ReactNode } from 'react';
import {
  Platform,
  StyleSheet,
  Text as RNText,
  type TextProps as RNTextProps,
  type TextStyle,
} from 'react-native';

import {
  resolverEstiloTexto,
  textTheme,
  useTheme,
  type EstiloBaseTexto,
  type NombreEstiloTipografico,
  type Plataforma,
} from '@/ui/theme';

/** Estilo heredable (como `DefaultTextStyle` de Flutter). */
const ContextoEstilo = createContext<EstiloBaseTexto | null>(null);

/**
 * Reemplaza la base que heredan los `Text` de adentro. Es lo que hacen en Flutter los botones,
 * chips o el título del AppBar: su estilo NO se mezcla con el bodyMedium (p.ej. altura natural y
 * sin letter-spacing). Los campos que no se pasan salen del texto por defecto del tema.
 */
export function DefaultTextStyle({
  estilo,
  children,
}: {
  estilo: Partial<EstiloBaseTexto>;
  children: ReactNode;
}) {
  const tema = useTheme();
  const valor = useMemo<EstiloBaseTexto>(
    () => ({
      fontSize: estilo.fontSize ?? 14,
      fontWeight: estilo.fontWeight ?? '400',
      altura: estilo.altura === undefined ? null : estilo.altura,
      letterSpacing: estilo.letterSpacing ?? 0,
      color: estilo.color ?? tema.colorTexto,
      fontFamily: estilo.fontFamily,
    }),
    [estilo.fontSize, estilo.fontWeight, estilo.altura, estilo.letterSpacing, estilo.color, estilo.fontFamily, tema.colorTexto],
  );
  return <ContextoEstilo.Provider value={valor}>{children}</ContextoEstilo.Provider>;
}

export interface TextProps extends RNTextProps {
  /** Estilo de la escala M3 (`Theme.of(context).textTheme.<variante>`). */
  variante?: NombreEstiloTipografico;
  /**
   * `TextStyle.height` de Flutter: multiplicador del tamaño. `null` = altura natural de la
   * fuente. Sin definir: la heredada (1.43 del bodyMedium, o la de la variante).
   */
  altura?: number | null;
}

const plataforma = Platform.OS as Plataforma;

/**
 * Texto base de la app (gotcha 1). Aplica lo que Flutter hereda a TODO texto: color
 * #1D1B20/#E6E0E9, Roboto 14, lineHeight ×1.43 y letterSpacing 0.25; un tamaño propio sigue
 * heredando la altura y el interletraje. Un `Text` anidado hereda del padre, como un TextSpan.
 */
export function Text({ variante, altura, style, children, ...resto }: TextProps) {
  const tema = useTheme();
  const heredado = useContext(ContextoEstilo);
  const base: EstiloBaseTexto = heredado ?? {
    ...textTheme.bodyMedium,
    color: tema.colorTexto,
  };
  const plano = (StyleSheet.flatten(style) ?? {}) as TextStyle;
  const resuelto = resolverEstiloTexto({ base, variante, estilo: plano, altura, plataforma });
  const paraHijos: EstiloBaseTexto = {
    fontSize: resuelto.fontSize,
    fontWeight: plano.fontWeight ?? (variante ? textTheme[variante].fontWeight : base.fontWeight),
    altura: altura !== undefined ? altura : variante ? textTheme[variante].altura : base.altura,
    letterSpacing: resuelto.letterSpacing ?? base.letterSpacing,
    color: (resuelto.color as string | undefined) ?? base.color,
    fontFamily: plano.fontFamily ?? base.fontFamily,
  };
  return (
    <RNText {...resto} style={resuelto}>
      <ContextoEstilo.Provider value={paraHijos}>{children}</ContextoEstilo.Provider>
    </RNText>
  );
}
