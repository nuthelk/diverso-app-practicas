import { act, fireEvent, screen } from '@testing-library/react-native';
import { StyleSheet, View } from 'react-native';

import { CollapsibleHeader, Text, headerMetrics } from '@/ui/components';

import { testTopInset, renderWithTheme } from '../support/render-with-theme';

// La cabecera sigue el foco de la pantalla (la barra de estado clara es solo de la pantalla
// visible); sin navegador, el doble la da por enfocada mientras esté montada.
jest.mock('expo-router', () => require('../../support/fake-expo-router'));
// `StatusBar` de expo-status-bar no pinta nada: el doble deja ver qué estilo pide.
jest.mock('expo-status-bar', () => {
  const { createElement } = require('react');
  const { View: RNView } = require('react-native');
  return { StatusBar: ({ style }: { style?: string }) => createElement(RNView, { testID: 'status-bar', barStyle: style }) };
});

/** Lo que calcula `_FondoSolido` + `FlexibleSpaceBar` de Flutter a partir del desplazamiento. */
describe('headerMetrics', () => {
  const expandedHeight = 300;
  const minHeight = 56 + 24;

  it('expandida: sin capa sólida, foto entera', () => {
    const m = headerMetrics(0, expandedHeight, minHeight);
    expect(m.collapse).toBe(0);
    expect(m.solid).toBe(0);
    expect(m.visibleHeight).toBe(300);
    expect(m.photoOpacity).toBe(1);
  });

  it('la capa sólida aparece desde el 60 % de colapso: clamp((colapso - .6) / .4)', () => {
    const range = expandedHeight - minHeight;
    expect(headerMetrics(range * 0.6, expandedHeight, minHeight).solid).toBeCloseTo(0, 5);
    expect(headerMetrics(range * 0.8, expandedHeight, minHeight).solid).toBeCloseTo(0.5, 5);
    expect(headerMetrics(range, expandedHeight, minHeight).solid).toBeCloseTo(1, 5);
  });

  it('colapsada: queda fija en la altura mínima', () => {
    const m = headerMetrics(5000, expandedHeight, minHeight);
    expect(m.collapse).toBe(1);
    expect(m.visibleHeight).toBe(minHeight);
    expect(m.photoOpacity).toBe(0);
  });

  it('parallax de la foto: sube a 1/4 de lo desplazado', () => {
    expect(headerMetrics(100, expandedHeight, minHeight).photoOffset).toBeCloseTo(-25, 5);
  });
});

// Port del grupo «cabecera colapsable» de cabeceras_test.dart.
describe('CollapsibleHeader', () => {
  const mount = (onBack = jest.fn()) =>
    renderWithTheme(
      <CollapsibleHeader
        title="Rutas de Antioquia Cultural"
        background={<View testID="photo" />}
        onBack={onBack}
        expandedHeight={220}
      >
        <Text>Rutas de Antioquia Cultural</Text>
        <View style={{ height: 2500 }} />
      </CollapsibleHeader>,
    );

  it('con la foto a la vista no hay título en la cabecera; el contenido arranca debajo', async () => {
    await mount();
    expect(screen.getByTestId('photo')).toBeOnTheScreen();
    expect(screen.queryByTestId('header-title')).toBeNull();
    expect(screen.getAllByText('Rutas de Antioquia Cultural')).toHaveLength(1);
    expect(screen.getByTestId('header-scroll').props.contentContainerStyle).toMatchObject({
      paddingTop: 220,
    });
  });

  it('al colapsar queda sólida con el título y «Volver»', async () => {
    const onBack = jest.fn();
    await mount(onBack);
    await act(async () => {
      fireEvent.scroll(screen.getByTestId('header-scroll'), {
        nativeEvent: {
          contentOffset: { x: 0, y: 2500 },
          contentSize: { width: 400, height: 3000 },
          layoutMeasurement: { width: 400, height: 800 },
        },
      });
    });
    const title = screen.getByTestId('header-title');
    expect(title).toHaveTextContent('Rutas de Antioquia Cultural');
    expect(title.props.numberOfLines).toBe(1);

    const backButton = screen.getByRole('button', { name: 'Volver' });
    await fireEvent.press(backButton);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('el título va entre el botón de volver (64) y el borde derecho (20), bajo la barra de estado', async () => {
    await mount();
    await act(async () => {
      fireEvent.scroll(screen.getByTestId('header-scroll'), {
        nativeEvent: {
          contentOffset: { x: 0, y: 2500 },
          contentSize: { width: 400, height: 3000 },
          layoutMeasurement: { width: 400, height: 800 },
        },
      });
    });
    const box = screen.getByTestId('header-title-box');
    expect(box.props.style).toMatchObject({ left: 64, right: 20, top: testTopInset, height: 56 });
  });

  const collapse = async () => {
    await act(async () => {
      fireEvent.scroll(screen.getByTestId('header-scroll'), {
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
    await mount();
    const [scrim, ...others] = scrims();
    expect(others).toHaveLength(0);
    expect(scrim).toBeDefined();
    const style = StyleSheet.flatten(scrim.props.style);
    expect(style.backgroundImage).toMatch(/^linear-gradient\(to bottom, rgba\(0,0,0,0\.35\)/);
    expect(style.backgroundImage).toContain('rgba(0,0,0,0)');
    expect(style).toMatchObject({ position: 'absolute', top: 0, left: 0, right: 0 });
    // Cubre la barra de estado y la fila de «Volver» (inset + 56).
    expect(style.height).toBeGreaterThanOrEqual(testTopInset + 56);
    expect(scrim.props.pointerEvents).toBe('none');
  });

  it('con la foto a la vista la barra de estado es clara; al colapsar vuelve a la de la app', async () => {
    await mount();
    expect(screen.queryByTestId('status-bar', { includeHiddenElements: true })?.props.barStyle).toBe('light');

    await collapse();
    expect(screen.queryByTestId('status-bar', { includeHiddenElements: true })).toBeNull();
  });
});

