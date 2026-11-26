import { act, fireEvent, renderRouter, screen, within } from 'expo-router/testing-library';
import type { ReactNode } from 'react';
import { StyleSheet, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppShell } from '@/features/shell/views/AppShell';
import { lightTheme, ThemeProvider } from '@/ui/theme';

/**
 * Barra inferior: fija al borde, sólida, con línea superior y cuatro destinos (Explorar,
 * Agencias, Reservas, Perfil). El contenido nunca queda debajo de ella. Sin red ni Supabase: las
 * páginas son marcadores. Port de `app_shell_test.dart`.
 */

const styleOf = (el: { props: { style?: unknown } }) => StyleSheet.flatten(el.props.style as never) as Record<string, unknown>;
const cs = lightTheme.colorScheme;

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <SafeAreaProvider
      initialMetrics={{ frame: { x: 0, y: 0, width: 400, height: 800 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}
    >
      <ThemeProvider initialMode="light">{children}</ThemeProvider>
    </SafeAreaProvider>
  );
}

const page = (text: string) => () => <Text testID={`page ${text}`}>{text}</Text>;

async function renderShell() {
  const r = await renderRouter(
    {
      '(tabs)/_layout': AppShell,
      '(tabs)/index': page('Página explorar'),
      '(tabs)/agencias': page('Página agencias'),
      '(tabs)/reservas': page('Página reservas'),
      '(tabs)/perfil': page('Página perfil'),
    },
    { initialUrl: '/', wrapper: Wrapper },
  );
  return r;
}

const bar = () => screen.getByTestId('bottom-bar');
const tab = (label: string) => within(bar()).getByRole('tab', { name: label });

afterEach(() => jest.useRealTimers());

test('tiene cuatro destinos: Explorar, Agencias, Reservas, Perfil', async () => {
  await renderShell();
  expect(within(bar()).getAllByRole('tab')).toHaveLength(4);
  for (const label of ['Explorar', 'Agencias', 'Reservas', 'Perfil']) {
    expect(within(bar()).getByText(label)).toBeOnTheScreen();
  }
});

test('el destino activo cambia al tocar y muestra su página', async () => {
  const r = await renderShell();
  expect(tab('Explorar')).toBeSelected();
  expect(screen.getByText('Página explorar')).toBeOnTheScreen();

  await fireEvent.press(tab('Agencias'));
  expect(tab('Agencias')).toBeSelected();
  expect(screen.getByText('Página agencias')).toBeOnTheScreen();
  expect(r.getPathname()).toBe('/agencias');

  await fireEvent.press(tab('Perfil'));
  expect(tab('Perfil')).toBeSelected();
  expect(tab('Explorar')).not.toBeSelected();
  expect(screen.getByText('Página perfil')).toBeOnTheScreen();
  expect(r.getPathname()).toBe('/perfil');
});

test('tocar la pestaña activa no navega ni recrea su página', async () => {
  const r = await renderShell();
  await fireEvent.press(tab('Explorar'));
  expect(r.getPathname()).toBe('/');
  expect(screen.getByText('Página explorar')).toBeOnTheScreen();
});

test('está pegada al borde inferior y ocupa todo el ancho (no flota)', async () => {
  await renderShell();
  const s = styleOf(bar());
  expect(s.position).not.toBe('absolute');
  expect(s.marginHorizontal ?? 0).toBe(0);
  expect(s.marginBottom ?? 0).toBe(0);
  expect(s.borderRadius ?? 0).toBe(0);
});

test('es sólida, con línea superior sutil', async () => {
  await renderShell();
  const navBar = styleOf(screen.getByTestId('navigation-bar'));
  expect(navBar.backgroundColor).toBe(lightTheme.components.navigationBar.backgroundColor);
  expect(navBar.backgroundColor).toMatch(/^#[0-9A-F]{6}$/i);
  expect(within(bar()).getByTestId('divider')).toBeOnTheScreen();
  expect(styleOf(within(bar()).getByTestId('divider')).backgroundColor).toBe(lightTheme.components.navigationBar.divider);
});

test('íconos más grandes y el activo en verde con su píldora', async () => {
  await renderShell();
  const active = within(bar()).getByTestId('icon-explore_rounded', { includeHiddenElements: true });
  expect(styleOf(active).fontSize).toBeGreaterThanOrEqual(28);
  expect(styleOf(active).color).toBe(cs.primary);
  expect(styleOf(within(tab('Explorar')).getByTestId('tab-indicator', { includeHiddenElements: true })).backgroundColor).toBe(
    cs.primaryContainer,
  );
  const inactive = within(bar()).getByTestId('icon-storefront_outlined', { includeHiddenElements: true });
  expect(styleOf(inactive).fontSize).toBeGreaterThanOrEqual(28);
  expect(styleOf(inactive).color).toBe(cs.onSurfaceVariant);
  expect(within(tab('Agencias')).queryByTestId('tab-indicator', { includeHiddenElements: true })).toBeNull();
});

test('cada destino lleva sus íconos de Flutter (contorno inactivo, relleno activo)', async () => {
  await renderShell();
  const ids = (name: string) => within(bar()).queryAllByTestId(`icon-${name}`, { includeHiddenElements: true }).length;
  expect([ids('explore_rounded'), ids('storefront_outlined'), ids('receipt_long_outlined'), ids('person_outline_rounded')]).toEqual([1, 1, 1, 1]);
  await act(async () => {
    await fireEvent.press(tab('Reservas'));
  });
  expect([ids('explore_outlined'), ids('receipt_long_rounded')]).toEqual([1, 1]);
});
