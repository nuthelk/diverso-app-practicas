import { act, fireEvent, screen } from '@testing-library/react-native';
import { StyleSheet, View } from 'react-native';

import { CabeceraColapsable, Text, medidasCabecera } from '@/ui/components';

import { testTopInset, renderWithTheme } from '../support/render-with-theme';

// La cabecera sigue el foco de la pantalla (la barra de estado clara es solo de la pantalla
// visible); sin navegador, el doble la da por enfocada mientras esté montada.
jest.mock('expo-router', () => require('../../support/expo-router-falso'));
// `StatusBar` de expo-status-bar no pinta nada: el doble deja ver qué estilo pide.
jest.mock('expo-status-bar', () => {
  const { createElement } = require('react');
  const { View: Vista } = require('react-native');
  return { StatusBar: ({ style }: { style?: string }) => createElement(Vista, { testID: 'barra-de-estado', estilo: style }) };
});

/** Lo que calcula `_FondoSolido` + `FlexibleSpaceBar` de Flutter a partir del desplazamiento. */
describe('medidasCabecera', () => {
  const alturaExpandida = 300;
  const minima = 56 + 24;

  it('expandida: sin capa sólida, foto entera', () => {
    const m = medidasCabecera(0, alturaExpandida, minima);
    expect(m.colapso).toBe(0);
    expect(m.solido).toBe(0);
    expect(m.alturaVisible).toBe(300);
    expect(m.opacidadFoto).toBe(1);
  });

  it('la capa sólida aparece desde el 60 % de colapso: clamp((colapso - .6) / .4)', () => {
    const rango = alturaExpandida - minima;
    expect(medidasCabecera(rango * 0.6, alturaExpandida, minima).solido).toBeCloseTo(0, 5);
    expect(medidasCabecera(rango * 0.8, alturaExpandida, minima).solido).toBeCloseTo(0.5, 5);
    expect(medidasCabecera(rango, alturaExpandida, minima).solido).toBeCloseTo(1, 5);
  });

  it('colapsada: queda fija en la altura mínima', () => {
    const m = medidasCabecera(5000, alturaExpandida, minima);
    expect(m.colapso).toBe(1);
    expect(m.alturaVisible).toBe(minima);
    expect(m.opacidadFoto).toBe(0);
  });

  it('parallax de la foto: sube a 1/4 de lo desplazado', () => {
    expect(medidasCabecera(100, alturaExpandida, minima).desplazamientoFoto).toBeCloseTo(-25, 5);
  });
});

// Port del grupo «cabecera colapsable» de cabeceras_test.dart.
describe('CabeceraColapsable', () => {
  const montar = (onVolver = jest.fn()) =>
    renderWithTheme(
      <CabeceraColapsable
        titulo="Rutas de Antioquia Cultural"
        fondo={<View testID="foto" />}
        onVolver={onVolver}
        alturaExpandida={220}
      >
        <Text>Rutas de Antioquia Cultural</Text>
        <View style={{ height: 2500 }} />
      </CabeceraColapsable>,
    );

  it('con la foto a la vista no hay título en la cabecera; el contenido arranca debajo', async () => {
    await montar();
    expect(screen.getByTestId('foto')).toBeOnTheScreen();
    expect(screen.queryByTestId('cabecera-titulo')).toBeNull();
    expect(screen.getAllByText('Rutas de Antioquia Cultural')).toHaveLength(1);
    expect(screen.getByTestId('cabecera-scroll').props.contentContainerStyle).toMatchObject({
      paddingTop: 220,
    });
  });

  it('al colapsar queda sólida con el título y «Volver»', async () => {
    const onVolver = jest.fn();
    await montar(onVolver);
    await act(async () => {
      fireEvent.scroll(screen.getByTestId('cabecera-scroll'), {
        nativeEvent: {
          contentOffset: { x: 0, y: 2500 },
          contentSize: { width: 400, height: 3000 },
          layoutMeasurement: { width: 400, height: 800 },
        },
      });
    });
    const titulo = screen.getByTestId('cabecera-titulo');
    expect(titulo).toHaveTextContent('Rutas de Antioquia Cultural');
    expect(titulo.props.numberOfLines).toBe(1);

    const volver = screen.getByRole('button', { name: 'Volver' });
    await fireEvent.press(volver);
    expect(onVolver).toHaveBeenCalledTimes(1);
  });

  it('el título va entre el botón de volver (64) y el borde derecho (20), bajo la barra de estado', async () => {
    await montar();
    await act(async () => {
      fireEvent.scroll(screen.getByTestId('cabecera-scroll'), {
        nativeEvent: {
          contentOffset: { x: 0, y: 2500 },
          contentSize: { width: 400, height: 3000 },
          layoutMeasurement: { width: 400, height: 800 },
        },
      });
    });
    const caja = screen.getByTestId('cabecera-titulo-caja');
    expect(caja.props.style).toMatchObject({ left: 64, right: 20, top: testTopInset, height: 56 });
  });

  const colapsar = async () => {
    await act(async () => {
      fireEvent.scroll(screen.getByTestId('cabecera-scroll'), {
        nativeEvent: {
          contentOffset: { x: 0, y: 2500 },
          contentSize: { width: 400, height: 3000 },
          layoutMeasurement: { width: 400, height: 800 },
        },
      });
    });
  };

  /** Capas con el degradado negro 35 % → transparente (el scrim de arriba). */
  const scrims = () =>
    screen.container.queryAll((n) =>
      String(StyleSheet.flatten(n.props.style)?.backgroundImage ?? '').includes('rgba(0,0,0,0.35)'),
    );

  it('con la foto a la vista: scrim arriba (barra de estado + «Volver») que no ataja toques', async () => {
    await montar();
    const [scrim, ...otros] = scrims();
    expect(otros).toHaveLength(0);
    expect(scrim).toBeDefined();
    const estilo = StyleSheet.flatten(scrim.props.style);
    expect(estilo.backgroundImage).toMatch(/^linear-gradient\(to bottom, rgba\(0,0,0,0\.35\)/);
    expect(estilo.backgroundImage).toContain('rgba(0,0,0,0)');
    expect(estilo).toMatchObject({ position: 'absolute', top: 0, left: 0, right: 0 });
    // Cubre la barra de estado y la fila de «Volver» (inset + 56).
    expect(estilo.height).toBeGreaterThanOrEqual(testTopInset + 56);
    expect(scrim.props.pointerEvents).toBe('none');
  });

  it('con la foto a la vista la barra de estado es clara; al colapsar vuelve a la de la app', async () => {
    await montar();
    expect(screen.queryByTestId('barra-de-estado', { includeHiddenElements: true })?.props.estilo).toBe('light');

    await colapsar();
    expect(screen.queryByTestId('barra-de-estado', { includeHiddenElements: true })).toBeNull();
  });
});

