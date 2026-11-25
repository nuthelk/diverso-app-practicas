import { fireEvent, screen } from '@testing-library/react-native';

import type { BottomTabBarProps } from 'expo-router/tabs';

import { BottomBar } from '@/features/shell/components/BottomBar';

import { renderWithTheme } from '../../../ui/support/render-with-theme';

/**
 * El navegador de pestañas guarda las rutas en el orden canónico de Expo Router
 * (index, perfil, agencias, reservas): la barra las dibuja en el orden de la marca.
 */
function props(active: string) {
  const names = ['index', 'perfil', 'agencias', 'reservas'];
  const routes = names.map((name) => ({ key: `${name}-k`, name }));
  const navigateToTab = jest.fn();
  return {
    navigateToTab,
    props: {
      state: { index: names.indexOf(active), routes },
      emitter: { emit: () => ({ defaultPrevented: false }) },
      navigateToTab,
      insets: { top: 0, bottom: 0, left: 0, right: 0 },
    } as unknown as BottomTabBarProps,
  };
}

describe('BottomBar', () => {
  test('dibuja Explorar, Agencias, Reservas, Perfil aunque el navegador tenga otro orden', async () => {
    await renderWithTheme(<BottomBar {...props('index').props} />);
    expect(screen.getAllByRole('tab').map((t) => t.props.accessibilityLabel)).toEqual(['Explorar', 'Agencias', 'Reservas', 'Perfil']);
  });

  test('marca la activa y navega a la ruta correcta por nombre', async () => {
    const { props: p, navigateToTab } = props('perfil');
    await renderWithTheme(<BottomBar {...p} />);
    expect(screen.getByRole('tab', { name: 'Perfil' }).props.accessibilityState).toMatchObject({ selected: true });
    await fireEvent.press(screen.getByRole('tab', { name: 'Agencias' }));
    expect(navigateToTab).toHaveBeenCalledWith('agencias-k');
  });
});
