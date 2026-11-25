import type { TextStyle } from 'react-native';

/**
 * Tipografía (§3.4). Flutter no trae fuentes propias: Roboto en Android y web, la del sistema en
 * iOS. Aquí se replica igual: en Android/web cada peso es un archivo de Roboto (cargado con
 * expo-font, ver `fonts.ts`), en iOS la fuente del sistema con `fontWeight`.
 */

export type FontWeight = NonNullable<TextStyle['fontWeight']>;

/** Un estilo de la escala: `height` es el multiplicador de `TextStyle.height` de Flutter. */
export interface TypographyStyle {
  fontSize: number;
  fontWeight: FontWeight;
  height: number;
  letterSpacing: number;
}

export type TypographyStyleName =
  | 'displayLarge'
  | 'displayMedium'
  | 'displaySmall'
  | 'headlineLarge'
  | 'headlineMedium'
  | 'headlineSmall'
  | 'titleLarge'
  | 'titleMedium'
  | 'titleSmall'
  | 'bodyLarge'
  | 'bodyMedium'
  | 'bodySmall'
  | 'labelLarge'
  | 'labelMedium'
  | 'labelSmall';

/** `ThemeData.light/dark().textTheme` (M3 2021) resuelto. `bodyMedium` es lo que hereda todo Text. */
export const textTheme: Record<TypographyStyleName, TypographyStyle> = {
  displayLarge: { fontSize: 57, fontWeight: '400', height: 1.12, letterSpacing: -0.25 },
  displayMedium: { fontSize: 45, fontWeight: '400', height: 1.16, letterSpacing: 0 },
  displaySmall: { fontSize: 36, fontWeight: '400', height: 1.22, letterSpacing: 0 },
  headlineLarge: { fontSize: 32, fontWeight: '400', height: 1.25, letterSpacing: 0 },
  headlineMedium: { fontSize: 28, fontWeight: '400', height: 1.29, letterSpacing: 0 },
  headlineSmall: { fontSize: 24, fontWeight: '400', height: 1.33, letterSpacing: 0 },
  titleLarge: { fontSize: 22, fontWeight: '400', height: 1.27, letterSpacing: 0 },
  titleMedium: { fontSize: 16, fontWeight: '500', height: 1.5, letterSpacing: 0.15 },
  titleSmall: { fontSize: 14, fontWeight: '500', height: 1.43, letterSpacing: 0.1 },
  bodyLarge: { fontSize: 16, fontWeight: '400', height: 1.5, letterSpacing: 0.5 },
  bodyMedium: { fontSize: 14, fontWeight: '400', height: 1.43, letterSpacing: 0.25 },
  bodySmall: { fontSize: 12, fontWeight: '400', height: 1.33, letterSpacing: 0.4 },
  labelLarge: { fontSize: 14, fontWeight: '500', height: 1.43, letterSpacing: 0.1 },
  labelMedium: { fontSize: 12, fontWeight: '500', height: 1.33, letterSpacing: 0.5 },
  labelSmall: { fontSize: 11, fontWeight: '500', height: 1.45, letterSpacing: 0.5 },
};

/** Escala de TAMAÑOS (`app_text.dart`): solo `fontSize`; el resto lo decide cada sitio. */
export const AppText = {
  micro: 10.5,
  note: 11,
  label: 11.5,
  caption: 12,
  largeCaption: 12.5,
  detail: 13,
  smallBody: 13.5,
  body: 14,
  largeBody: 14.5,
  emphasis: 15,
  largeEmphasis: 15.5,
  subtitle: 16,
  largeSubtitle: 17,
  headingXs: 19,
  headingS: 20,
  headingM: 21,
  headingL: 22,
  headingXl: 24,
  heading2xl: 25,
  heading3xl: 26,
  /** Título de cada pestaña; ver `TituloPagina`. */
  pageTitle: 28,
  /** Cifras y códigos que son el dato de la pantalla. */
  figure: 30,
  /** Emoji de categoría cuando hace de foto. */
  photoEmoji: 40,
  /** Nombre de la marca en el panel de bienvenida. */
  brand: 42,
} as const;

const robotoFiles: Record<number, string> = {
  100: 'Roboto_100Thin',
  200: 'Roboto_200ExtraLight',
  300: 'Roboto_300Light',
  400: 'Roboto_400Regular',
  500: 'Roboto_500Medium',
  600: 'Roboto_600SemiBold',
  700: 'Roboto_700Bold',
  800: 'Roboto_800ExtraBold',
  900: 'Roboto_900Black',
};

export function numericWeight(weight: FontWeight | undefined): number {
  if (weight === undefined || weight === 'normal' || weight === 'regular') return 400;
  if (weight === 'bold') return 700;
  if (weight === 'ultralight') return 200;
  if (weight === 'thin') return 100;
  if (weight === 'light') return 300;
  if (weight === 'medium') return 500;
  if (weight === 'semibold') return 600;
  if (weight === 'condensedBold' || weight === 'heavy') return 800;
  if (weight === 'black' || weight === 'condensed') return 900;
  const n = Number(weight);
  return Number.isFinite(n) ? Math.min(900, Math.max(100, Math.round(n / 100) * 100)) : 400;
}

/** Familia de Roboto (expo-google-fonts) que corresponde a un peso. */
export function robotoFamily(weight: FontWeight | undefined): string {
  return robotoFiles[numericWeight(weight)];
}

/** Monospace de `EmptyState.detalle` (`fontFamily: 'monospace'`). */
export const monospaceFamily = { ios: 'Menlo', others: 'monospace' } as const;

/** Lo que un `DefaultTextStyle` deja heredar. `height: null` = altura natural de la fuente. */
export interface BaseTextStyle {
  fontSize: number;
  fontWeight: FontWeight;
  height: number | null;
  letterSpacing: number;
  color: string;
  fontFamily?: string;
}

export type PlatformName = 'ios' | 'android' | 'web' | 'windows' | 'macos';

export interface TextStyleInput {
  base: BaseTextStyle;
  variant?: TypographyStyleName;
  /** Estilo del sitio (aplanado). */
  style?: TextStyle;
  /** `TextStyle.height`: multiplicador; `null` = natural; sin definir = el heredado. */
  height?: number | null;
  platform: PlatformName;
}

/**
 * Mezcla como `DefaultTextStyle.of(context).style.merge(style)` de Flutter: lo que el sitio no
 * fija (altura, letter-spacing, color…) se hereda. En RN `lineHeight` es absoluto, así que se
 * recalcula con el tamaño final.
 */
export function resolveTextStyle({
  base,
  variant,
  style = {},
  height,
  platform,
}: TextStyleInput): TextStyle & { fontSize: number } {
  const v = variant ? textTheme[variant] : undefined;
  const fontSize = style.fontSize ?? v?.fontSize ?? base.fontSize;
  const fontWeight = style.fontWeight ?? v?.fontWeight ?? base.fontWeight;
  const letterSpacing = style.letterSpacing ?? v?.letterSpacing ?? base.letterSpacing;
  const factor = height !== undefined ? height : (v?.height ?? base.height);
  const lineHeight = style.lineHeight ?? (factor === null ? undefined : fontSize * factor);
  const explicitFamily = style.fontFamily ?? base.fontFamily;
  const usesRoboto = platform === 'android' || platform === 'web';

  // Sin `lineHeight`, `fontFamily` ni `fontWeight` del sitio: se ponen solo si corresponden.
  const { lineHeight: _lh, fontFamily: _ff, fontWeight: _fw, ...rest } = style;
  const family: Pick<TextStyle, 'fontFamily' | 'fontWeight'> = explicitFamily
    ? { fontFamily: explicitFamily, fontWeight }
    : usesRoboto
      ? // En Android un fontWeight sobre una fuente cargada busca otra variante o sintetiza
        // negritas: el peso lo da el archivo.
        { fontFamily: robotoFamily(fontWeight) }
      : { fontWeight };
  return {
    ...rest,
    fontSize,
    letterSpacing,
    color: style.color ?? base.color,
    ...(lineHeight === undefined ? null : { lineHeight }),
    ...family,
  };
}
