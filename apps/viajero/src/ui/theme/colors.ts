/**
 * Colores del sistema de diseño (port de `app_theme.dart` y `diverso_colors.dart`).
 *
 * El ColorScheme NO se calcula desde la semilla: son los literales que resuelve Flutter con
 * `ColorScheme.fromSeed(seedColor: #0E6E4F)` (material_color_utilities 0.13.0, tonalSpot,
 * contraste 0). Recalcularlos en JS con otra versión del algoritmo daría tonos distintos.
 */

export interface ColorScheme {
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  secondary: string;
  onSecondary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;
  tertiary: string;
  onTertiary: string;
  tertiaryContainer: string;
  onTertiaryContainer: string;
  error: string;
  onError: string;
  errorContainer: string;
  onErrorContainer: string;
  surface: string;
  onSurface: string;
  onSurfaceVariant: string;
  surfaceContainerLowest: string;
  surfaceContainerLow: string;
  surfaceContainer: string;
  surfaceContainerHigh: string;
  surfaceContainerHighest: string;
  surfaceDim: string;
  surfaceBright: string;
  outline: string;
  outlineVariant: string;
  inverseSurface: string;
  onInverseSurface: string;
  inversePrimary: string;
  shadow: string;
  scrim: string;
  surfaceTint: string;
}

export const lightColorScheme: ColorScheme = {
  primary: '#1F6A4F',
  onPrimary: '#FFFFFF',
  primaryContainer: '#A8F2CE',
  onPrimaryContainer: '#005139',
  secondary: '#4D6358',
  onSecondary: '#FFFFFF',
  secondaryContainer: '#CFE9D9',
  onSecondaryContainer: '#354B40',
  tertiary: '#3E6374',
  onTertiary: '#FFFFFF',
  tertiaryContainer: '#C1E8FC',
  onTertiaryContainer: '#254B5B',
  error: '#BA1A1A',
  onError: '#FFFFFF',
  errorContainer: '#FFDAD6',
  onErrorContainer: '#93000A',
  surface: '#F5FBF5',
  onSurface: '#171D1A',
  onSurfaceVariant: '#404943',
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerLow: '#EFF5EF',
  surfaceContainer: '#EAEFEA',
  surfaceContainerHigh: '#E4EAE4',
  surfaceContainerHighest: '#DEE4DE',
  surfaceDim: '#D6DBD6',
  surfaceBright: '#F5FBF5',
  outline: '#707973',
  outlineVariant: '#BFC9C2',
  inverseSurface: '#2C322E',
  onInverseSurface: '#EDF2EC',
  inversePrimary: '#8CD5B3',
  shadow: '#000000',
  scrim: '#000000',
  surfaceTint: '#1F6A4F',
};

export const darkColorScheme: ColorScheme = {
  primary: '#8CD5B3',
  onPrimary: '#003826',
  primaryContainer: '#005139',
  onPrimaryContainer: '#A8F2CE',
  secondary: '#B3CCBE',
  onSecondary: '#1F352B',
  secondaryContainer: '#354B40',
  onSecondaryContainer: '#CFE9D9',
  tertiary: '#A5CCDF',
  onTertiary: '#083544',
  tertiaryContainer: '#254B5B',
  onTertiaryContainer: '#C1E8FC',
  error: '#FFB4AB',
  onError: '#690005',
  errorContainer: '#93000A',
  onErrorContainer: '#FFDAD6',
  surface: '#0F1512',
  onSurface: '#DEE4DE',
  onSurfaceVariant: '#BFC9C2',
  surfaceContainerLowest: '#0A0F0C',
  surfaceContainerLow: '#171D1A',
  surfaceContainer: '#1B211E',
  surfaceContainerHigh: '#252B28',
  surfaceContainerHighest: '#303632',
  surfaceDim: '#0F1512',
  surfaceBright: '#353B37',
  outline: '#8A938C',
  outlineVariant: '#404943',
  inverseSurface: '#DEE4DE',
  onInverseSurface: '#2C322E',
  inversePrimary: '#1F6A4F',
  shadow: '#000000',
  scrim: '#000000',
  surfaceTint: '#8CD5B3',
};

/** `scaffoldBackgroundColor`: el fondo de página, que NO es `surface`. */
export const pageBackground = { light: '#FAFAF8', dark: '#101312' } as const;

/**
 * Color de TODO texto sin color explícito. Son los neutros del esquema M3 *baseline* (morado),
 * no el `onSurface` verde: el `textTheme` se copia de `ThemeData.light()/dark()` con sus colores.
 */
export const defaultTextColor = { light: '#1D1B20', dark: '#E6E0E9' } as const;

/** Colores que no están en el ColorScheme (`ThemeExtension` `DiversoColors`). */
export interface DiversoColorsTokens {
  /** Estrellas de calificación. */
  gold: string;
  /** Píldoras de estado de la reserva (texto blanco encima). */
  statusConfirmed: string;
  statusPending: string;
  statusCancelled: string;
  /** «Realizada» y «Completada». */
  statusClosed: string;
  /** Aviso «¡Últimos N!». */
  fewSpots: string;
  /** Fondo del sello «Verificada RNT» sobre foto. */
  sealOverPhoto: string;
  /** Controles pequeños sobre foto (código de reserva, quitar de la comparación). */
  controlOverPhoto: string;
  /** Sombra de las insignias que flotan sobre la foto. */
  badgeShadow: string;
}

const diversoLight: DiversoColorsTokens = {
  gold: '#E8A33D',
  statusConfirmed: '#1B7A4B',
  statusPending: '#B25E09',
  statusCancelled: '#B3261E',
  statusClosed: '#4A5C6E',
  fewSpots: '#EF6C00',
  sealOverPhoto: 'rgba(0, 0, 0, 0.66)',
  controlOverPhoto: 'rgba(0, 0, 0, 0.62)',
  badgeShadow: 'rgba(0, 0, 0, 0.25)',
};

export const DiversoColors = {
  light: diversoLight,
  /** Hoy iguales a `claro` (como en Flutter). */
  dark: diversoLight,
  /** Círculo de iniciales de las agencias (todos con contraste con blanco). El orden importa. */
  agencyPalette: [
    '#0E6E4F', // verde selva
    '#2D4A73', // azul pizarra
    '#7A4A21', // tierra
    '#6B3A5B', // ciruela
    '#1F6F7A', // lago
    '#8A4B14', // cobre
    '#4A6A2A', // musgo
    '#4F4A8A', // añil
  ] as readonly string[],
} as const;

/** `color.withValues(alpha: a)` de Flutter para un hex `#RRGGBB`. */
export function withAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.replace('#', '').slice(0, 6), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
