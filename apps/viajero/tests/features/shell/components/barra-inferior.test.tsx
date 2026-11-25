import { fireEvent, screen } from '@testing-library/react-native';

import type { BottomTabBarProps } from 'expo-router/tabs';

import { BarraInferior } from '@/features/shell/components/BarraInferior';

import { renderWithTheme } from '../../../ui/support/render-with-theme';

/**
 * El navegador de pestañas guarda las rutas en el orden canónico de Expo Router
 * (index, perfil, agencias, reservas): la barra las dibuja en el orden de la marca.
 */
function props(activa: string) {
  const nombres = ['index', 'perfil', 'agencias', 'reservas'];
  const routes = nombres.map((name) => ({ key: `${name}-k`, name }));
  const navigateToTab = jest.fn();
  return {
    navigateToTab,
    props: {
      state: { index: nombres.indexOf(activa), routes },
      emitter: { emit: () => ({ defaultPrevented: false }) },
      navigateToTab,
      insets: { top: 0, bottom: 0, left: 0, right: 0 },
    } as unknown as BottomTabBarProps,
  };
}

describe('BarraInferior', () => {
  test('dibuja Explorar, Agencias, Reservas, Perfil aunque el navegador tenga otro orden', async () => {
    await renderWithTheme(<BarraInferior {...props('index').props} />);
    expect(screen.getAllByRole('tab').map((t) => t.props.accessibilityLabel)).toEqual(['Explorar', 'Agencias', 'Reservas', 'Perfil']);
  });

  test('marca la activa y navega a la ruta correcta por nombre', async () => {
    const { props: p, navigateToTab } = props('perfil');
    await renderWithTheme(<BarraInferior {...p} />);
    expect(screen.getByRole('tab', { name: 'Perfil' }).props.accessibilityState).toMatchObject({ selected: true });
    await fireEvent.press(screen.getByRole('tab', { name: 'Agencias' }));
    expect(navigateToTab).toHaveBeenCalledWith('agencias-k');
  });
});
