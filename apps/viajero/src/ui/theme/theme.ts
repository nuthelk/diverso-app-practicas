import {
  lightColorScheme,
  darkColorScheme,
  defaultTextColor,
  withAlpha,
  DiversoColors,
  pageBackground,
  type ColorScheme,
  type DiversoColorsTokens,
} from './colors';
import { AppRadii } from './metrics';
import { AppText, textTheme, type FontWeight } from './typography';

export type Brightness = 'light' | 'dark';

/**
 * Componentes del tema (§3.7) ya resueltos para un modo. Los valores de tamaño/relleno se
 * midieron con `flutter test` sobre `AppTheme.viajeroLight/Dark` (no son los defaults de M3 de
 * memoria).
 */
export interface ThemeComponents {
  appBar: {
    backgroundColor: string;
    surfaceTintColor: 'transparent';
    foregroundColor: string;
    titleSpacing: number;
    toolbarHeight: number;
    title: { fontSize: number; fontWeight: FontWeight; letterSpacing: number; color: string };
  };
  navigationBar: {
    height: number;
    backgroundColor: string;
    indicatorColor: string;
    iconSize: number;
    selectedColor: string;
    unselectedColor: string;
    label: { fontSize: number; selectedWeight: FontWeight; weight: FontWeight };
    /** Divider de 1 px encima de la barra. */
    divider: string;
  };
  navigationRail: {
    indicatorColor: string;
    selectedIconColor: string;
    label: { fontSize: number; selectedColor: string; color: string; selectedWeight: FontWeight; weight: FontWeight };
  };
  input: {
    fillColor: string;
    radius: number;
    focusBorder: { color: string; width: number };
    errorBorder: { color: string; width: number };
    focusErrorBorder: { color: string; width: number };
    cursor: string;
    errorCursor: string;
  };
  chip: {
    backgroundColor: 'transparent';
    label: { fontSize: number; fontWeight: FontWeight; color: string };
    deleteIconColor: string;
    avatarColor: string;
  };
  divider: { color: string; height: number };
  card: { backgroundColor: string; radius: number };
  snackBar: { radius: number };
  dialog: { radius: number };
  listTile: { radius: number };
  /** Overlay de «pressed» de M3 (10 % del color del contenido). */
  pressedOpacity: number;
}

/** Tokens de un modo efectivo: lo que devuelve `useTheme()`. */
export interface Theme {
  brightness: Brightness;
  colorScheme: ColorScheme;
  diverso: DiversoColorsTokens;
  /** `scaffoldBackgroundColor` (≠ surface). */
  pageBackground: string;
  /** Color de todo texto sin color propio (#1D1B20 / #E6E0E9). */
  textColor: string;
  textTheme: typeof textTheme;
  components: ThemeComponents;
}

function buildTheme(brightness: Brightness): Theme {
  const isLight = brightness === 'light';
  const cs = isLight ? lightColorScheme : darkColorScheme;
  const page = isLight ? pageBackground.light : pageBackground.dark;
  return {
    brightness,
    colorScheme: cs,
    diverso: isLight ? DiversoColors.light : DiversoColors.dark,
    pageBackground: page,
    textColor: isLight ? defaultTextColor.light : defaultTextColor.dark,
    textTheme,
    components: {
      appBar: {
        backgroundColor: page,
        surfaceTintColor: 'transparent',
        foregroundColor: cs.onSurface,
        titleSpacing: 20,
        toolbarHeight: 56,
        title: { fontSize: AppText.emphasis, fontWeight: '700', letterSpacing: -0.2, color: cs.onSurface },
      },
      navigationBar: {
        height: 72,
        backgroundColor: cs.surfaceContainerLowest,
        indicatorColor: cs.primaryContainer,
        iconSize: 28,
        selectedColor: cs.primary,
        unselectedColor: cs.onSurfaceVariant,
        label: { fontSize: AppText.caption, selectedWeight: '700', weight: '600' },
        divider: withAlpha(cs.outlineVariant, 0.5),
      },
      navigationRail: {
        indicatorColor: cs.primaryContainer,
        selectedIconColor: cs.onPrimaryContainer,
        label: {
          fontSize: AppText.smallBody,
          selectedColor: cs.onSurface,
          color: cs.onSurfaceVariant,
          selectedWeight: '700',
          weight: '500',
        },
      },
      input: {
        fillColor: isLight ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.05)',
        radius: AppRadii.field,
        focusBorder: { color: cs.primary, width: 1.6 },
        errorBorder: { color: cs.error, width: 1.2 },
        focusErrorBorder: { color: cs.error, width: 1.6 },
        cursor: cs.primary,
        errorCursor: cs.error,
      },
      chip: {
        // Medido: el InputChip de M3 sin `color` ni borde (side: none) es transparente.
        backgroundColor: 'transparent',
        label: { fontSize: AppText.detail, fontWeight: '600', color: cs.onSurface },
        deleteIconColor: cs.onSurfaceVariant,
        avatarColor: cs.onSurfaceVariant,
      },
      divider: { color: withAlpha(cs.outlineVariant, 0.5), height: 1 },
      card: { backgroundColor: cs.surfaceContainerLow, radius: AppRadii.card },
      snackBar: { radius: AppRadii.field },
      dialog: { radius: AppRadii.sheet },
      listTile: { radius: AppRadii.field },
      pressedOpacity: 0.1,
    },
  };
}

export const lightTheme: Theme = buildTheme('light');
export const darkTheme: Theme = buildTheme('dark');

export function themeFor(brightness: Brightness): Theme {
  return brightness === 'dark' ? darkTheme : lightTheme;
}
