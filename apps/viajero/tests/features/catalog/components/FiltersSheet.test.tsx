import { screen, within } from '@testing-library/react-native';
import { Platform, StyleSheet } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { FiltersSheet, type FiltersSheetModel } from '@/features/catalog/components/FiltersSheet';

import { renderWithTheme } from '../../../ui/support/render-with-theme';

/**
 * Disposición de la hoja «Filtros» en Android edge-to-edge (SDK 58): llega al borde inferior real,
 * el pie «Limpiar / Aplicar filtros» queda fijo fuera del scroll y la lista de destinos no es un
 * scroll anidado. El comportamiento (aplicar, limpiar, chips) está en `views/filters.test.tsx`.
 */

type TreeNode = { type: unknown; props: Record<string, unknown>; parent: TreeNode | null };

const INSETS = { top: 24, left: 0, right: 0, bottom: 47 };
const DESTINATIONS = Array.from({ length: 30 }, (_, i) => `Destino ${i + 1}`);

async function renderSheet() {
  jest.replaceProperty(Platform, 'OS', 'android');
  const vm: FiltersSheetModel = { destination: null, maxPrice: null, date: null, destinations: DESTINATIONS, applyFilters: jest.fn() };
  await renderWithTheme(
    <SafeAreaInsetsContext.Provider value={INSETS}>
      <FiltersSheet visible vm={vm} onClose={jest.fn()} />
    </SafeAreaInsetsContext.Provider>,
  );
}

function ancestors(el: TreeNode) {
  const list: TreeNode[] = [];
  for (let p = el.parent; p; p = p.parent) list.push(p);
  return list;
}
const isScroll = (n: TreeNode) => n.type === 'RCTScrollView';
const styleOf = (n: TreeNode) => StyleSheet.flatten(n.props.style as never) ?? {};

afterEach(() => jest.restoreAllMocks());

test('el Modal dibuja bajo la barra de estado y la de navegación (edge-to-edge)', async () => {
  await renderSheet();

  const modal = ancestors(screen.getByTestId('filtros-sheet') as unknown as TreeNode).find((n) => n.type === 'Modal')!;
  expect(modal.props.statusBarTranslucent).toBe(true);
  expect(modal.props.navigationBarTranslucent).toBe(true);
});

test('«Limpiar» y «Aplicar filtros» son un pie fijo fuera del scroll, con el inset inferior como relleno', async () => {
  await renderSheet();

  const footer = screen.getByTestId('filtros-pie') as unknown as TreeNode;
  expect(within(footer as never).getByText('Limpiar')).toBeOnTheScreen();
  expect(within(footer as never).getByText('Aplicar filtros')).toBeOnTheScreen();
  expect(ancestors(footer).some(isScroll)).toBe(false);
  expect(ancestors(footer)).toContain(screen.getByTestId('filtros-sheet'));
  expect(styleOf(footer).paddingBottom).toBe(16 + INSETS.bottom);
  // La hoja no repite el inset: lo pone el pie, pegado al borde inferior.
  expect(styleOf(screen.getByTestId('filtros-sheet') as unknown as TreeNode).paddingBottom ?? 0).toBe(0);
});

test('la lista de destinos no es un scroll anidado: el gesto mueve toda la hoja', async () => {
  await renderSheet();

  const destination = screen.getByTestId('destino-Destino 30') as unknown as TreeNode;
  expect(ancestors(destination).filter(isScroll)).toHaveLength(1);
});

test('con teclado, la hoja sube con behavior="padding" también en Android', async () => {
  await renderSheet();

  // KeyboardAvoidingView con `padding` compone `paddingBottom` en su View; sin behavior, no.
  const keyboard = screen.getByTestId('filtros-teclado') as unknown as TreeNode;
  expect(styleOf(keyboard)).toHaveProperty('paddingBottom');
});
