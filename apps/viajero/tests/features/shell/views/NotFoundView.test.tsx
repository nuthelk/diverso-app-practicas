import { fireEvent, screen } from '@testing-library/react-native';

import { NotFoundView } from '@/features/shell/views/NotFoundView';

import { resetFakeRouter, fakeRouter } from '../../../support/fake-expo-router';
import { icon } from '../../../ui/support/render-with-theme';
import { renderScreen } from '../../../support/render-screen';

jest.mock('expo-router', () => require('../../../support/fake-expo-router'));

/** 404 interno (`errorBuilder` de go_router): una URL que no existe (enlace mal escrito o viejo). */
beforeEach(resetFakeRouter);

test('dice que no existe, muestra la ubicación y lleva al inicio', async () => {
  await renderScreen(<NotFoundView location="/esta/no/existe?x=1" />);

  expect(screen.getByText('No encontramos esta página')).toBeOnTheScreen();
  expect(screen.getByText('El enlace puede estar mal escrito o la página ya no existe.')).toBeOnTheScreen();
  expect(screen.getByText('/esta/no/existe?x=1')).toBeOnTheScreen();
  expect(icon('explore_off_rounded')).toBeDefined();

  await fireEvent.press(screen.getByRole('button', { name: 'Ir al inicio' }));
  expect(fakeRouter.replace).toHaveBeenCalledWith('/');
});
