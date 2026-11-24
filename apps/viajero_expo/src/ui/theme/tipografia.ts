import type { TextStyle } from 'react-native';

/**
 * Tipografía (§3.4). Flutter no trae fuentes propias: Roboto en Android y web, la del sistema en
 * iOS. Aquí se replica igual: en Android/web cada peso es un archivo de Roboto (cargado con
 * expo-font, ver `fuentes.ts`), en iOS la fuente del sistema con `fontWeight`.
 */

export type PesoFuente = NonNullable<TextStyle['fontWeight']>;

/** Un estilo de la escala: `altura` es el multiplicador de `TextStyle.height` de Flutter. */
export interface EstiloTipografico {
  fontSize: number;
  fontWeight: PesoFuente;
  altura: number;
  letterSpacing: number;
}

export type NombreEstiloTipografico =
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
export const textTheme: Record<NombreEstiloTipografico, EstiloTipografico> = {
  displayLarge: { fontSize: 57, fontWeight: '400', altura: 1.12, letterSpacing: -0.25 },
  displayMedium: { fontSize: 45, fontWeight: '400', altura: 1.16, letterSpacing: 0 },
  displaySmall: { fontSize: 36, fontWeight: '400', altura: 1.22, letterSpacing: 0 },
  headlineLarge: { fontSize: 32, fontWeight: '400', altura: 1.25, letterSpacing: 0 },
  headlineMedium: { fontSize: 28, fontWeight: '400', altura: 1.29, letterSpacing: 0 },
  headlineSmall: { fontSize: 24, fontWeight: '400', altura: 1.33, letterSpacing: 0 },
  titleLarge: { fontSize: 22, fontWeight: '400', altura: 1.27, letterSpacing: 0 },
  titleMedium: { fontSize: 16, fontWeight: '500', altura: 1.5, letterSpacing: 0.15 },
  titleSmall: { fontSize: 14, fontWeight: '500', altura: 1.43, letterSpacing: 0.1 },
  bodyLarge: { fontSize: 16, fontWeight: '400', altura: 1.5, letterSpacing: 0.5 },
  bodyMedium: { fontSize: 14, fontWeight: '400', altura: 1.43, letterSpacing: 0.25 },
  bodySmall: { fontSize: 12, fontWeight: '400', altura: 1.33, letterSpacing: 0.4 },
  labelLarge: { fontSize: 14, fontWeight: '500', altura: 1.43, letterSpacing: 0.1 },
  labelMedium: { fontSize: 12, fontWeight: '500', altura: 1.33, letterSpacing: 0.5 },
  labelSmall: { fontSize: 11, fontWeight: '500', altura: 1.45, letterSpacing: 0.5 },
};

/** Escala de TAMAÑOS (`app_text.dart`): solo `fontSize`; el resto lo decide cada sitio. */
export const AppText = {
  micro: 10.5,
  nota: 11,
  etiqueta: 11.5,
  leyenda: 12,
  leyendaGrande: 12.5,
  detalle: 13,
  cuerpoChico: 13.5,
  cuerpo: 14,
  cuerpoGrande: 14.5,
  enfasis: 15,
  enfasisGrande: 15.5,
  subtitulo: 16,
  subtituloGrande: 17,
  encabezadoXs: 19,
  encabezadoS: 20,
  encabezadoM: 21,
  encabezadoL: 22,
  encabezadoXl: 24,
  encabezado2xl: 25,
  encabezado3xl: 26,
  /** Título de cada pestaña; ver `TituloPagina`. */
  tituloPagina: 28,
  /** Cifras y códigos que son el dato de la pantalla. */
  cifra: 30,
  /** Emoji de categoría cuando hace de foto. */
  emojiFoto: 40,
  /** Nombre de la marca en el panel de bienvenida. */
  marca: 42,
} as const;

const archivosRoboto: Record<number, string> = {
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

export function pesoNumerico(peso: PesoFuente | undefined): number {
  if (peso === undefined || peso === 'normal' || peso === 'regular') return 400;
  if (peso === 'bold') return 700;
  if (peso === 'ultralight') return 200;
  if (peso === 'thin') return 100;
  if (peso === 'light') return 300;
  if (peso === 'medium') return 500;
  if (peso === 'semibold') return 600;
  if (peso === 'condensedBold' || peso === 'heavy') return 800;
  if (peso === 'black' || peso === 'condensed') return 900;
  const n = Number(peso);
  return Number.isFinite(n) ? Math.min(900, Math.max(100, Math.round(n / 100) * 100)) : 400;
}

/** Familia de Roboto (expo-google-fonts) que corresponde a un peso. */
export function familiaRoboto(peso: PesoFuente | undefined): string {
  return archivosRoboto[pesoNumerico(peso)];
}

/** Monospace de `EmptyState.detalle` (`fontFamily: 'monospace'`). */
export const familiaMonospace = { ios: 'Menlo', otras: 'monospace' } as const;

/** Lo que un `DefaultTextStyle` deja heredar. `altura: null` = altura natural de la fuente. */
export interface EstiloBaseTexto {
  fontSize: number;
  fontWeight: PesoFuente;
  altura: number | null;
  letterSpacing: number;
  color: string;
  fontFamily?: string;
}

export type Plataforma = 'ios' | 'android' | 'web' | 'windows' | 'macos';

export interface EntradaEstiloTexto {
  base: EstiloBaseTexto;
  variante?: NombreEstiloTipografico;
  /** Estilo del sitio (aplanado). */
  estilo?: TextStyle;
  /** `TextStyle.height`: multiplicador; `null` = natural; sin definir = el heredado. */
  altura?: number | null;
  plataforma: Plataforma;
}

/**
 * Mezcla como `DefaultTextStyle.of(context).style.merge(style)` de Flutter: lo que el sitio no
 * fija (altura, letter-spacing, color…) se hereda. En RN `lineHeight` es absoluto, así que se
 * recalcula con el tamaño final.
 */
export function resolverEstiloTexto({
  base,
  variante,
  estilo = {},
  altura,
  plataforma,
}: EntradaEstiloTexto): TextStyle & { fontSize: number } {
  const v = variante ? textTheme[variante] : undefined;
  const fontSize = estilo.fontSize ?? v?.fontSize ?? base.fontSize;
  const fontWeight = estilo.fontWeight ?? v?.fontWeight ?? base.fontWeight;
  const letterSpacing = estilo.letterSpacing ?? v?.letterSpacing ?? base.letterSpacing;
  const factor = altura !== undefined ? altura : (v?.altura ?? base.altura);
  const lineHeight = estilo.lineHeight ?? (factor === null ? undefined : fontSize * factor);
  const familiaExplicita = estilo.fontFamily ?? base.fontFamily;
  const usaRoboto = plataforma === 'android' || plataforma === 'web';

  // Sin `lineHeight`, `fontFamily` ni `fontWeight` del sitio: se ponen solo si corresponden.
  const { lineHeight: _lh, fontFamily: _ff, fontWeight: _fw, ...resto } = estilo;
  const familia: Pick<TextStyle, 'fontFamily' | 'fontWeight'> = familiaExplicita
    ? { fontFamily: familiaExplicita, fontWeight }
    : usaRoboto
      ? // En Android un fontWeight sobre una fuente cargada busca otra variante o sintetiza
        // negritas: el peso lo da el archivo.
        { fontFamily: familiaRoboto(fontWeight) }
      : { fontWeight };
  return {
    ...resto,
    fontSize,
    letterSpacing,
    color: estilo.color ?? base.color,
    ...(lineHeight === undefined ? null : { lineHeight }),
    ...familia,
  };
}
