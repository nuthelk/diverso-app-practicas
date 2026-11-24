import { act, fireEvent, renderRouter, screen, within } from 'expo-router/testing-library';
import type { ReactNode } from 'react';
import { StyleSheet, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppShell } from '@/features/shell/views/AppShell';
import { temaClaro, ThemeProvider } from '@/ui/theme';

/**
 * Barra inferior: fija al borde, sólida, con línea superior y cuatro destinos (Explorar,
 * Agencias, Reservas, Perfil). El contenido nunca queda debajo de ella. Sin red ni Supabase: las
 * páginas son marcadores. Port de `app_shell_test.dart`.
 */

const estilo = (el: { props: { style?: unknown } }) => StyleSheet.flatten(el.props.style as never) as Record<string, unknown>;
const cs = temaClaro.colorScheme;

function Envoltura({ children }: { children: ReactNode }) {
  return (
    <SafeAreaProvider
      initialMetrics={{ frame: { x: 0, y: 0, width: 400, height: 800 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}
    >
      <ThemeProvider modoInicial="light">{children}</ThemeProvider>
    </SafeAreaProvider>
  );
}

const pagina = (texto: string) => () => <Text testID={`pagina ${texto}`}>{texto}</Text>;

async function abrir() {
  const r = await renderRouter(
    {
      '(tabs)/_layout': AppShell,
      '(tabs)/index': pagina('Página explorar'),
      '(tabs)/agencias': pagina('Página agencias'),
      '(tabs)/reservas': pagina('Página reservas'),
      '(tabs)/perfil': pagina('Página perfil'),
    },
    { initialUrl: '/', wrapper: Envoltura },
  );
  return r;
}

const barra = () => screen.getByTestId('barra-inferior');
const destino = (etiqueta: string) => within(barra()).getByRole('tab', { name: etiqueta });

afterEach(() => jest.useRealTimers());

test('tiene cuatro destinos: Explorar, Agencias, Reservas, Perfil', async () => {
  await abrir();
  expect(within(barra()).getAllByRole('tab')).toHaveLength(4);
  for (const etiqueta of ['Explorar', 'Agencias', 'Reservas', 'Perfil']) {
    expect(within(barra()).getByText(etiqueta)).toBeOnTheScreen();
  }
});

test('el destino activo cambia al tocar y muestra su página', async () => {
  const r = await abrir();
  expect(destino('Explorar')).toBeSelected();
  expect(screen.getByText('Página explorar')).toBeOnTheScreen();

  await fireEvent.press(destino('Agencias'));
  expect(destino('Agencias')).toBeSelected();
  expect(screen.getByText('Página agencias')).toBeOnTheScreen();
  expect(r.getPathname()).toBe('/agencias');

  await fireEvent.press(destino('Perfil'));
  expect(destino('Perfil')).toBeSelected();
  expect(destino('Explorar')).not.toBeSelected();
  expect(screen.getByText('Página perfil')).toBeOnTheScreen();
  expect(r.getPathname()).toBe('/perfil');
});

test('tocar la pestaña activa no navega ni recrea su página', async () => {
  const r = await abrir();
  await fireEvent.press(destino('Explorar'));
  expect(r.getPathname()).toBe('/');
  expect(screen.getByText('Página explorar')).toBeOnTheScreen();
});

test('está pegada al borde inferior y ocupa todo el ancho (no flota)', async () => {
  await abrir();
  const s = estilo(barra());
  expect(s.position).not.toBe('absolute');
  expect(s.marginHorizontal ?? 0).toBe(0);
  expect(s.marginBottom ?? 0).toBe(0);
  expect(s.borderRadius ?? 0).toBe(0);
});

test('es sólida, con línea superior sutil', async () => {
  await abrir();
  const barraNav = estilo(screen.getByTestId('navigation-bar'));
  expect(barraNav.backgroundColor).toBe(temaClaro.componentes.navigationBar.backgroundColor);
  expect(barraNav.backgroundColor).toMatch(/^#[0-9A-F]{6}$/i);
  expect(within(barra()).getByTestId('divider')).toBeOnTheScreen();
  expect(estilo(within(barra()).getByTestId('divider')).backgroundColor).toBe(temaClaro.componentes.navigationBar.divisor);
});

test('íconos más grandes y el activo en verde con su píldora', async () => {
  await abrir();
  const activo = within(barra()).getByTestId('icono-explore_rounded', { includeHiddenElements: true });
  expect(estilo(activo).fontSize).toBeGreaterThanOrEqual(28);
  expect(estilo(activo).color).toBe(cs.primary);
  expect(estilo(within(destino('Explorar')).getByTestId('indicador', { includeHiddenElements: true })).backgroundColor).toBe(
    cs.primaryContainer,
  );
  const inactivo = within(barra()).getByTestId('icono-storefront_outlined', { includeHiddenElements: true });
  expect(estilo(inactivo).fontSize).toBeGreaterThanOrEqual(28);
  expect(estilo(inactivo).color).toBe(cs.onSurfaceVariant);
  expect(within(destino('Agencias')).queryByTestId('indicador', { includeHiddenElements: true })).toBeNull();
});

test('cada destino lleva sus íconos de Flutter (contorno inactivo, relleno activo)', async () => {
  await abrir();
  const ids = (nombre: string) => within(barra()).queryAllByTestId(`icono-${nombre}`, { includeHiddenElements: true }).length;
  expect([ids('explore_rounded'), ids('storefront_outlined'), ids('receipt_long_outlined'), ids('person_outline_rounded')]).toEqual([1, 1, 1, 1]);
  await act(async () => {
    await fireEvent.press(destino('Reservas'));
  });
  expect([ids('explore_outlined'), ids('receipt_long_rounded')]).toEqual([1, 1]);
});
