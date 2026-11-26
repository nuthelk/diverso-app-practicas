import { type Href, router } from 'expo-router';
import { act, fireEvent, renderRouter, screen, within } from 'expo-router/testing-library';
import { StyleSheet } from 'react-native';

import { AppProviders } from '@/composition/AppRoot';
import { AppRoutes } from '@/router';
import { AppNavigation } from '@/router/AppNavigation';
import { lightTheme, darkTheme, useThemeMode, type ThemeMode } from '@/ui/theme';

import { startApp, settle, visibleScreen } from '../support/app';
import { FakeAuth } from '../support/fake-auth';
import { testDependencies } from '../support/test-dependencies';

/**
 * Arranque de la app tal como la cablea `_layout.tsx` (providers + guard + rutas reales) con
 * repositorios falsos en lugar de Supabase. Atrapa lo que las pruebas de cada pantalla no ven:
 * una ruta que no resuelve o un `useDependencies()` sin provider. Port de `app_arranque_test.dart`
 * y `app_test.dart`, más el recorrido de TODAS las rutas de la tabla §1.1.
 */

afterEach(() => jest.useRealTimers());

const bottomBar = () => screen.queryByTestId('bottom-bar');

async function goToTab(label: string) {
  await fireEvent.press(within(screen.getByTestId('bottom-bar')).getByRole('tab', { name: label }));
  await settle();
}

test('sin sesión arranca en /login', async () => {
  const r = await startApp('/', testDependencies({ auth: new FakeAuth({ userId: null }) }));

  expect(r.getPathname()).toBe('/login');
  expect(screen.getByText('Entra para seguir explorando Antioquia.')).toBeOnTheScreen();
  expect(visibleScreen('CatalogView')).toBeNull();
});

test('con sesión y consentimiento aceptado arranca en el catálogo', async () => {
  const r = await startApp();

  expect(r.getPathname()).toBe('/');
  expect(visibleScreen('CatalogView')).toBeOnTheScreen();
  expect(screen.queryByText('Entra para seguir explorando Antioquia.')).toBeNull();
  expect(bottomBar()).toBeOnTheScreen();
});

test('cada pestaña se construye sin dependencias faltantes', async () => {
  const r = await startApp();

  const tabs: [string, string, string][] = [
    ['Agencias', 'AgenciesView', '/agencias'],
    ['Reservas', 'BookingsView', '/reservas'],
    ['Perfil', 'ProfileView', '/perfil'],
    ['Explorar', 'CatalogView', '/'],
  ];
  for (const [label, view, route] of tabs) {
    await goToTab(label);
    expect([label, r.getPathname()]).toEqual([label, route]);
    expect(visibleScreen(view)).toBeOnTheScreen();
  }
});

describe('cada ruta de la tabla resuelve con sus parámetros', () => {
  const routes: [string, string, string[]][] = [
    ['/', 'CatalogView', []],
    ['/agencias', 'AgenciesView', []],
    ['/reservas', 'BookingsView', []],
    ['/perfil', 'ProfileView', []],
    // Pantallas reales (T5): que el id llegue al repositorio lo prueba `catalog-routes.test.tsx`.
    [AppRoutes.agency('a1'), 'AgencyView', []],
    [AppRoutes.plan('p1'), 'PlanDetailView', []],
    // Pantallas reales (T6), con dobles que rechazan: el id que llega a cada repositorio lo prueba
    // `features/checkout/payment-routes.test.tsx`.
    [AppRoutes.checkout('p1', 'f1'), 'CheckoutView', ['No pudimos cargar el plan']],
    [AppRoutes.paymentForTransaction('tx-77'), 'PaymentResultView', ['No pudimos verificar el pago']],
    [AppRoutes.paymentForBooking('r1'), 'PaymentResultView', ['No pudimos verificar el pago']],
    [AppRoutes.booking('b1'), 'BookingConfirmationView', ['No pudimos cargar la reserva']],
    // Pantallas reales (T7), con dobles que rechazan: el id que llega al repositorio lo prueban
    // `consent-guard-review.test.tsx` y `features/bookings/views/*`.
    [AppRoutes.bookingDetail('b1'), 'BookingDetailView', ['No pudimos cargar la reserva']],
    [AppRoutes.review('b1'), 'ReviewView', ['No pudimos cargar la reserva']],
    ['/comparar?ids=b,a,,b,c,d', 'ComparatorView', []],
    ['/comparar', 'ComparatorView', ['Nada para comparar']],
  ];
  for (const [url, view, params] of routes) {
    test(`${url} → ${view}`, async () => {
      await startApp(url);
      expect(visibleScreen(view)).toBeOnTheScreen();
      for (const p of params) expect(screen.getByText(p)).toBeOnTheScreen();
    });
  }

  test('/login con sesión al día lleva al inicio', async () => {
    const r = await startApp('/login');
    expect(r.getPathname()).toBe('/');
  });

  test('/legal/:doc abre el documento', async () => {
    await startApp(AppRoutes.legal('privacidad'));
    expect(screen.getByText('Documentos legales')).toBeOnTheScreen();
    expect(screen.getByText('Política de tratamiento de datos personales')).toBeOnTheScreen();
  });

  test('/legal/:doc también sin sesión', async () => {
    const r = await startApp(AppRoutes.legal('terminos-viajeros'), testDependencies({ auth: new FakeAuth({ userId: null }) }));
    expect(r.getPathname()).toBe('/legal/terminos-viajeros');
    expect(screen.getByText('Documentos legales')).toBeOnTheScreen();
  });

  test('una URL que no existe muestra «No encontramos esta página» con la ubicación', async () => {
    await startApp('/esta/no/existe');
    expect(screen.getByText('No encontramos esta página')).toBeOnTheScreen();
    expect(screen.getByText('/esta/no/existe')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Ir al inicio' }));
    await settle();
    expect(visibleScreen('CatalogView')).toBeOnTheScreen();
  });
});

describe('rutas anteriores (dependían de `extra`, que se pierde al recargar)', () => {
  test('/checkout lleva al inicio', async () => {
    const r = await startApp('/checkout');
    expect(r.getPathname()).toBe('/');
  });

  test('/exito lleva a Mis reservas', async () => {
    const r = await startApp('/exito');
    expect(r.getPathname()).toBe('/reservas');
  });

  test('/resena lleva a Mis reservas', async () => {
    const r = await startApp('/resena');
    expect(r.getPathname()).toBe('/reservas');
  });
});

test('cambiar el tema no recrea el router ni reinicia la navegación', async () => {
  let setThemeMode!: (mode: ThemeMode) => void;
  function ModeCapture() {
    setThemeMode = useThemeMode().setMode;
    return null;
  }
  const r = await renderRouter(
    {
      appDir: 'src/app',
      overrides: {
        _layout: () => (
          <AppProviders dependencies={testDependencies()} initialThemeMode="light">
            <ModeCapture />
            <AppNavigation ready />
          </AppProviders>
        ),
      },
    },
    { initialUrl: '/' },
  );
  await settle();
  await act(async () => router.push(AppRoutes.legal('privacidad') as Href));
  await settle();
  expect(screen.getByText('Documentos legales')).toBeOnTheScreen();
  const background = () => StyleSheet.flatten(screen.getByTestId('top-bar').props.style).backgroundColor;
  expect(background()).toBe(lightTheme.pageBackground);

  await act(async () => setThemeMode('dark'));
  await settle();

  expect(r.getPathname()).toBe('/legal/privacidad');
  expect(screen.getByText('Documentos legales')).toBeOnTheScreen();
  expect(background()).toBe(darkTheme.pageBackground);
  expect(router.canGoBack()).toBe(true);
});
