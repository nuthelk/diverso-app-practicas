import { renderRouter, screen } from 'expo-router/testing-library';

import { settle } from '../support/app';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

/**
 * El `_layout.tsx` de producción (cliente de Supabase real, sesión en AsyncStorage) arranca sin
 * red: sin sesión guardada, la app abre en el login. Comprueba el cableado real, no solo los dobles.
 */
afterEach(() => jest.useRealTimers());

test('sin sesión guardada, el _layout real abre el login', async () => {
  const r = await renderRouter('src/app', { initialUrl: '/' });
  await settle();

  expect(r.getPathname()).toBe('/login');
  expect(screen.getByText('Entra para seguir explorando Antioquia.')).toBeOnTheScreen();
  await r.unmount();
});
