import { type Href, router } from 'expo-router';
import { act, fireEvent, renderRouter, screen, within } from 'expo-router/testing-library';
import { StyleSheet } from 'react-native';

import { ProveedoresDeLaApp } from '@/composition/RaizDeLaApp';
import { AppRoutes } from '@/router';
import { NavegacionDeLaApp } from '@/router/NavegacionDeLaApp';
import { temaClaro, temaOscuro, useThemeMode, type ModoTema } from '@/ui/theme';

import { arrancarApp, asentar, pantallaVisible } from '../support/app';
import { AuthFalso } from '../support/auth-falso';
import { dependenciasDePrueba } from '../support/dependencias-de-prueba';

/**
 * Arranque de la app tal como la cablea `_layout.tsx` (providers + guard + rutas reales) con
 * repositorios falsos en lugar de Supabase. Atrapa lo que las pruebas de cada pantalla no ven:
 * una ruta que no resuelve o un `useDependencies()` sin provider. Port de `app_arranque_test.dart`
 * y `app_test.dart`, más el recorrido de TODAS las rutas de la tabla §1.1.
 */

afterEach(() => jest.useRealTimers());

const barra = () => screen.queryByTestId('barra-inferior');

async function irAPestana(etiqueta: string) {
  await fireEvent.press(within(screen.getByTestId('barra-inferior')).getByRole('tab', { name: etiqueta }));
  await asentar();
}

test('sin sesión arranca en /login', async () => {
  const r = await arrancarApp('/', dependenciasDePrueba({ auth: new AuthFalso({ usuario: null }) }));

  expect(r.getPathname()).toBe('/login');
  expect(screen.getByText('Bienvenido de vuelta')).toBeOnTheScreen();
  expect(pantallaVisible('CatalogView')).toBeNull();
});

test('con sesión y consentimiento aceptado arranca en el catálogo', async () => {
  const r = await arrancarApp();

  expect(r.getPathname()).toBe('/');
  expect(pantallaVisible('CatalogView')).toBeOnTheScreen();
  expect(screen.queryByText('Bienvenido de vuelta')).toBeNull();
  expect(barra()).toBeOnTheScreen();
});

test('cada pestaña se construye sin dependencias faltantes', async () => {
  const r = await arrancarApp();

  const pestanas: [string, string, string][] = [
    ['Agencias', 'AgenciasView', '/agencias'],
    ['Reservas', 'BookingsView', '/reservas'],
    ['Perfil', 'ProfileView', '/perfil'],
    ['Explorar', 'CatalogView', '/'],
  ];
  for (const [etiqueta, vista, ruta] of pestanas) {
    await irAPestana(etiqueta);
    expect([etiqueta, r.getPathname()]).toEqual([etiqueta, ruta]);
    expect(pantallaVisible(vista)).toBeOnTheScreen();
  }
});

describe('cada ruta de la tabla resuelve con sus parámetros', () => {
  const rutas: [string, string, string[]][] = [
    ['/', 'CatalogView', []],
    ['/agencias', 'AgenciasView', []],
    ['/reservas', 'BookingsView', []],
    ['/perfil', 'ProfileView', []],
    // Pantallas reales (T5): que el id llegue al repositorio lo prueba `rutas-catalogo.test.tsx`.
    [AppRoutes.agencia('a1'), 'AgenciaView', []],
    [AppRoutes.plan('p1'), 'PlanDetailView', []],
    // Pantallas reales (T6), con dobles que rechazan: el id que llega a cada repositorio lo prueba
    // `features/checkout/rutas-pago.test.tsx`.
    [AppRoutes.checkout('p1', 'f1'), 'CheckoutView', ['No pudimos cargar el plan']],
    [AppRoutes.pagoDeTransaccion('tx-77'), 'PagoResultadoView', ['No pudimos verificar el pago']],
    [AppRoutes.pagoDeReserva('r1'), 'PagoResultadoView', ['No pudimos verificar el pago']],
    [AppRoutes.reserva('b1'), 'ReservaView', ['No pudimos cargar la reserva']],
    // Pantallas reales (T7), con dobles que rechazan: el id que llega al repositorio lo prueban
    // `consentimiento-guard-resena.test.tsx` y `features/bookings/views/*`.
    [AppRoutes.reservaDetalle('b1'), 'ReservaDetalleView', ['No pudimos cargar la reserva']],
    [AppRoutes.resena('b1'), 'ReviewView', ['No pudimos cargar la reserva']],
    ['/comparar?ids=b,a,,b,c,d', 'ComparatorView', []],
    ['/comparar', 'ComparatorView', ['Nada para comparar']],
  ];
  for (const [url, vista, params] of rutas) {
    test(`${url} → ${vista}`, async () => {
      await arrancarApp(url);
      expect(pantallaVisible(vista)).toBeOnTheScreen();
      for (const p of params) expect(screen.getByText(p)).toBeOnTheScreen();
    });
  }

  test('/login con sesión al día lleva al inicio', async () => {
    const r = await arrancarApp('/login');
    expect(r.getPathname()).toBe('/');
  });

  test('/legal/:doc abre el documento', async () => {
    await arrancarApp(AppRoutes.legal('privacidad'));
    expect(screen.getByText('Documentos legales')).toBeOnTheScreen();
    expect(screen.getByText('Política de tratamiento de datos personales')).toBeOnTheScreen();
  });

  test('/legal/:doc también sin sesión', async () => {
    const r = await arrancarApp(AppRoutes.legal('terminos-viajeros'), dependenciasDePrueba({ auth: new AuthFalso({ usuario: null }) }));
    expect(r.getPathname()).toBe('/legal/terminos-viajeros');
    expect(screen.getByText('Documentos legales')).toBeOnTheScreen();
  });

  test('una URL que no existe muestra «No encontramos esta página» con la ubicación', async () => {
    await arrancarApp('/esta/no/existe');
    expect(screen.getByText('No encontramos esta página')).toBeOnTheScreen();
    expect(screen.getByText('/esta/no/existe')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Ir al inicio' }));
    await asentar();
    expect(pantallaVisible('CatalogView')).toBeOnTheScreen();
  });
});

describe('rutas anteriores (dependían de `extra`, que se pierde al recargar)', () => {
  test('/checkout lleva al inicio', async () => {
    const r = await arrancarApp('/checkout');
    expect(r.getPathname()).toBe('/');
  });

  test('/exito lleva a Mis reservas', async () => {
    const r = await arrancarApp('/exito');
    expect(r.getPathname()).toBe('/reservas');
  });

  test('/resena lleva a Mis reservas', async () => {
    const r = await arrancarApp('/resena');
    expect(r.getPathname()).toBe('/reservas');
  });
});

test('cambiar el tema no recrea el router ni reinicia la navegación', async () => {
  let cambiarModo!: (modo: ModoTema) => void;
  function CapturaModo() {
    cambiarModo = useThemeMode().setModo;
    return null;
  }
  const r = await renderRouter(
    {
      appDir: 'src/app',
      overrides: {
        _layout: () => (
          <ProveedoresDeLaApp dependencias={dependenciasDePrueba()} modoTemaInicial="light">
            <CapturaModo />
            <NavegacionDeLaApp listo />
          </ProveedoresDeLaApp>
        ),
      },
    },
    { initialUrl: '/' },
  );
  await asentar();
  await act(async () => router.push(AppRoutes.legal('privacidad') as Href));
  await asentar();
  expect(screen.getByText('Documentos legales')).toBeOnTheScreen();
  const fondo = () => StyleSheet.flatten(screen.getByTestId('barra-superior').props.style).backgroundColor;
  expect(fondo()).toBe(temaClaro.fondoPagina);

  await act(async () => cambiarModo('dark'));
  await asentar();

  expect(r.getPathname()).toBe('/legal/privacidad');
  expect(screen.getByText('Documentos legales')).toBeOnTheScreen();
  expect(fondo()).toBe(temaOscuro.fondoPagina);
  expect(router.canGoBack()).toBe(true);
});
