import { fireEvent, screen } from '@testing-library/react-native';

import { PaginaNoEncontradaView } from '@/features/shell/views/PaginaNoEncontradaView';

import { reiniciarRouterFalso, routerFalso } from '../../../support/expo-router-falso';
import { icon } from '../../../ui/support/render-with-theme';
import { renderPantalla } from '../../../support/pantalla';

jest.mock('expo-router', () => require('../../../support/expo-router-falso'));

/** 404 interno (`errorBuilder` de go_router): una URL que no existe (enlace mal escrito o viejo). */
beforeEach(reiniciarRouterFalso);

test('dice que no existe, muestra la ubicación y lleva al inicio', async () => {
  await renderPantalla(<PaginaNoEncontradaView ubicacion="/esta/no/existe?x=1" />);

  expect(screen.getByText('No encontramos esta página')).toBeOnTheScreen();
  expect(screen.getByText('El enlace puede estar mal escrito o la página ya no existe.')).toBeOnTheScreen();
  expect(screen.getByText('/esta/no/existe?x=1')).toBeOnTheScreen();
  expect(icon('explore_off_rounded')).toBeDefined();

  await fireEvent.press(screen.getByRole('button', { name: 'Ir al inicio' }));
  expect(routerFalso.replace).toHaveBeenCalledWith('/');
});
