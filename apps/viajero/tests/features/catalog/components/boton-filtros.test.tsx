import { screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { BotonFiltros } from '@/features/catalog/components/BotonFiltros';

import { renderWithTheme } from '../../../ui/support/render-with-theme';

jest.mock('expo-router', () => require('../../../support/expo-router-falso'));

const vm = { filtrosActivos: 0 } as never;
const fondo = () => StyleSheet.flatten(screen.getByRole('button', { name: 'Filtros y orden' }).props.style).backgroundColor;

describe('BotonFiltros', () => {
  test('en oscuro su caja se ve (relleno claro de los campos), no queda negra sobre negro', async () => {
    await renderWithTheme(<BotonFiltros vm={vm} />, { mode: 'dark' });
    expect(fondo()).toBe('rgba(255, 255, 255, 0.05)');
  });

  test('en claro usa el mismo relleno que el buscador de al lado', async () => {
    await renderWithTheme(<BotonFiltros vm={vm} />);
    expect(fondo()).toBe('rgba(0, 0, 0, 0.04)');
  });
});
