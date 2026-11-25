import { act, fireEvent, screen } from '@testing-library/react-native';
import { View } from 'react-native';

import { CabeceraColapsable, Text, medidasCabecera } from '@/ui/components';

import { insetSuperiorDePrueba, renderConTema } from '../support/conTema';

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
    renderConTema(
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
    expect(caja.props.style).toMatchObject({ left: 64, right: 20, top: insetSuperiorDePrueba, height: 56 });
  });
});
