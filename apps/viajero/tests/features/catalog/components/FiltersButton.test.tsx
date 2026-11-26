import { screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { FiltersButton } from '@/features/catalog/components/FiltersButton';

import { renderWithTheme } from '../../../ui/support/render-with-theme';

jest.mock('expo-router', () => require('../../../support/fake-expo-router'));

const vm = { activeFilterCount: 0 } as never;
const background = () => StyleSheet.flatten(screen.getByRole('button', { name: 'Filtros y orden' }).props.style).backgroundColor;

describe('FiltersButton', () => {
  test('en oscuro su caja se ve (relleno claro de los campos), no queda negra sobre negro', async () => {
    await renderWithTheme(<FiltersButton vm={vm} />, { mode: 'dark' });
    expect(background()).toBe('rgba(255, 255, 255, 0.05)');
  });

  test('en claro usa el mismo relleno que el buscador de al lado', async () => {
    await renderWithTheme(<FiltersButton vm={vm} />);
    expect(background()).toBe('rgba(0, 0, 0, 0.04)');
  });
});
