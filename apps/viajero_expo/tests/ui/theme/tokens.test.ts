import {
  AppInsets,
  AppRadios,
  AppText,
  AppTheme,
  DiversoColors,
  conAlfa,
  temaClaro,
  temaOscuro,
} from '@/ui/theme';

/**
 * Fija los tokens críticos con los LITERALES del inventario (§3), que son los que pinta Flutter
 * (ColorScheme.fromSeed(#0E6E4F) resuelto con material_color_utilities 0.13.0). Si alguno cambia,
 * la app deja de verse igual.
 */
describe('marca y breakpoint', () => {
  it('semillas y breakpoint único', () => {
    expect(AppTheme.seedViajero).toBe('#0E6E4F');
    expect(AppTheme.seedPanel).toBe('#2D4A73');
    expect(AppTheme.bpCompact).toBe(640);
  });
});

describe('ColorScheme resuelto', () => {
  const claro: Record<string, string> = {
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
  const oscuro: Record<string, string> = {
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
    expect(temaClaro.colorScheme).toEqual(claro);
  });

  it('oscuro: cada rol con su hex literal', () => {
    expect(temaOscuro.colorScheme).toEqual(oscuro);
  });

  it('brillo de cada tema', () => {
    expect(temaClaro.brillo).toBe('light');
    expect(temaOscuro.brillo).toBe('dark');
  });
});

describe('fondo de página y texto por defecto', () => {
  it('el fondo de página NO es surface', () => {
    expect(temaClaro.fondoPagina).toBe('#FAFAF8');
    expect(temaOscuro.fondoPagina).toBe('#101312');
    expect(temaClaro.fondoPagina).not.toBe(temaClaro.colorScheme.surface);
  });

  it('el color del texto por defecto es el neutro M3 baseline, no onSurface', () => {
    expect(temaClaro.colorTexto).toBe('#1D1B20');
    expect(temaOscuro.colorTexto).toBe('#E6E0E9');
    expect(temaClaro.colorTexto).not.toBe(temaClaro.colorScheme.onSurface);
  });
});

describe('DiversoColors', () => {
  it('valores literales, iguales en claro y oscuro', () => {
    const esperado = {
      dorado: '#E8A33D',
      estadoConfirmada: '#1B7A4B',
      estadoPendiente: '#B25E09',
      estadoCancelada: '#B3261E',
      estadoCerrada: '#4A5C6E',
      pocosCupos: '#EF6C00',
      selloSobreFoto: 'rgba(0, 0, 0, 0.66)',
      controlSobreFoto: 'rgba(0, 0, 0, 0.62)',
      sombraInsignia: 'rgba(0, 0, 0, 0.25)',
    };
    expect(temaClaro.diverso).toEqual(esperado);
    expect(temaOscuro.diverso).toEqual(esperado);
  });

  it('paleta de agencias en su orden', () => {
    expect(DiversoColors.paletaAgencias).toEqual([
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

describe('conAlfa', () => {
  it('equivale a Color.withValues(alpha:) de Flutter', () => {
    expect(conAlfa('#1F6A4F', 0.1)).toBe('rgba(31, 106, 79, 0.1)');
    expect(conAlfa('#BFC9C2', 0.5)).toBe('rgba(191, 201, 194, 0.5)');
    expect(conAlfa('#FFFFFF', 0.05)).toBe('rgba(255, 255, 255, 0.05)');
  });
});

describe('escala de tamaños, espaciados y radios', () => {
  it('AppText', () => {
    expect(AppText).toEqual({
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
      tituloPagina: 28,
      cifra: 30,
      emojiFoto: 40,
      marca: 42,
    });
  });

  it('AppInsets como padding de RN', () => {
    expect(AppInsets.lista).toEqual({
      paddingLeft: 20,
      paddingTop: 4,
      paddingRight: 20,
      paddingBottom: 24,
    });
    expect(AppInsets.listaConAire).toEqual({
      paddingLeft: 20,
      paddingTop: 8,
      paddingRight: 20,
      paddingBottom: 24,
    });
    expect(AppInsets.entreTarjetas).toEqual({ paddingBottom: 14 });
    expect(AppInsets.tarjeta).toEqual({ padding: 14 });
    expect(AppInsets.tarjetaAmplia).toEqual({ padding: 16 });
    expect(AppInsets.tarjetaGrande).toEqual({ padding: 18 });
    expect(AppInsets.contenido).toEqual({ padding: 20 });
    expect(AppInsets.pantalla).toEqual({ padding: 24 });
  });

  it('AppRadios', () => {
    expect(AppRadios).toEqual({ field: 14, control: 12, card: 20, sheet: 28, pill: 999 });
  });
});
