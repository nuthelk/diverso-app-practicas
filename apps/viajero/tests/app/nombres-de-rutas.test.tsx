import { screen, within } from 'expo-router/testing-library';

import { arrancarApp } from '../support/app';

/**
 * Expo Router arma el estado inicial con las rutas en su orden canónico. Si los navegadores las
 * declaran en otro orden (lista de Stack.Screen / Tabs.Screen), React Navigation despacha
 * ROUTE_NAMES_CHANGED en cada arranque y en desarrollo sale un error rojo («was not handled by any
 * navigator»). Los navegadores no declaran listas ordenadas: el orden visual lo pone la barra.
 */
// El error solo se reproduce en el dispositivo (en Jest, renderRouter arma el estado de otra forma):
// se verificó con un log en useNavigationBuilder. Aquí se fija el orden visual de la barra.
describe('nombres de rutas', () => {
  test('la barra muestra las pestañas en el orden de la marca: Explorar, Agencias, Reservas, Perfil', async () => {
    await arrancarApp('/');
    const pestanas = within(screen.getByTestId('navigation-bar')).getAllByRole('tab');
    expect(pestanas.map((p) => p.props.accessibilityLabel)).toEqual(['Explorar', 'Agencias', 'Reservas', 'Perfil']);
  });
});
