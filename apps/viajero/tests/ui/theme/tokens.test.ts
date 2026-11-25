import {
  AppInsets,
  AppRadii,
  AppText,
  AppTheme,
  DiversoColors,
  withAlpha,
  lightTheme,
  darkTheme,
} from '@/ui/theme';

/**
 * Fija los tokens críticos con los LITERALES del inventario (§3), que son los que pinta Flutter
 * (ColorScheme.fromSeed(#0E6E4F) resuelto con material_color_utilities 0.13.0). Si alguno cambia,
 * la app deja de verse igual.
 */
describe('marca y breakpoint', () => {
  it('semillas y breakpoint único', () => {
    expect(AppTheme.seedTraveler).toBe('#0E6E4F');
    expect(AppTheme.seedPanel).toBe('#2D4A73');
    expect(AppTheme.bpCompact).toBe(640);
  });
});

describe('ColorScheme resuelto', () => {
  const light: Record<string, string> = {
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
  const dark: Record<string, string> = {
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

  it('claro: cada rol con su hex literal', () => {
    expect(lightTheme.colorScheme).toEqual(light);
  });

  it('oscuro: cada rol con su hex literal', () => {
    expect(darkTheme.colorScheme).toEqual(dark);
  });

  it('brillo de cada tema', () => {
    expect(lightTheme.brightness).toBe('light');
    expect(darkTheme.brightness).toBe('dark');
  });
});

describe('fondo de página y texto por defecto', () => {
  it('el fondo de página NO es surface', () => {
    expect(lightTheme.pageBackground).toBe('#FAFAF8');
    expect(darkTheme.pageBackground).toBe('#101312');
    expect(lightTheme.pageBackground).not.toBe(lightTheme.colorScheme.surface);
  });

  it('el color del texto por defecto es el neutro M3 baseline, no onSurface', () => {
    expect(lightTheme.textColor).toBe('#1D1B20');
    expect(darkTheme.textColor).toBe('#E6E0E9');
    expect(lightTheme.textColor).not.toBe(lightTheme.colorScheme.onSurface);
  });
});

describe('DiversoColors', () => {
  it('valores literales, iguales en claro y oscuro', () => {
    const expected = {
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
    expect(lightTheme.diverso).toEqual(expected);
    expect(darkTheme.diverso).toEqual(expected);
  });

  it('paleta de agencias en su orden', () => {
    expect(DiversoColors.agencyPalette).toEqual([
      '#0E6E4F',
      '#2D4A73',
      '#7A4A21',
      '#6B3A5B',
      '#1F6F7A',
      '#8A4B14',
      '#4A6A2A',
      '#4F4A8A',
    ]);
  });
});

describe('withAlpha', () => {
  it('equivale a Color.withValues(alpha:) de Flutter', () => {
    expect(withAlpha('#1F6A4F', 0.1)).toBe('rgba(31, 106, 79, 0.1)');
    expect(withAlpha('#BFC9C2', 0.5)).toBe('rgba(191, 201, 194, 0.5)');
    expect(withAlpha('#FFFFFF', 0.05)).toBe('rgba(255, 255, 255, 0.05)');
  });
});

describe('escala de tamaños, espaciados y radios', () => {
  it('AppText', () => {
    expect(AppText).toEqual({
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
      pageTitle: 28,
      figure: 30,
      photoEmoji: 40,
      brand: 42,
    });
  });

  it('AppInsets como padding de RN', () => {
    expect(AppInsets.list).toEqual({
      paddingLeft: 20,
      paddingTop: 4,
      paddingRight: 20,
      paddingBottom: 24,
    });
    expect(AppInsets.roomyList).toEqual({
      paddingLeft: 20,
      paddingTop: 8,
      paddingRight: 20,
      paddingBottom: 24,
    });
    expect(AppInsets.betweenCards).toEqual({ paddingBottom: 14 });
    expect(AppInsets.card).toEqual({ padding: 14 });
    expect(AppInsets.wideCard).toEqual({ padding: 16 });
    expect(AppInsets.largeCard).toEqual({ padding: 18 });
    expect(AppInsets.content).toEqual({ padding: 20 });
    expect(AppInsets.screen).toEqual({ padding: 24 });
  });

  it('AppRadii', () => {
    expect(AppRadii).toEqual({ field: 14, control: 12, card: 20, sheet: 28, pill: 999 });
  });
});
