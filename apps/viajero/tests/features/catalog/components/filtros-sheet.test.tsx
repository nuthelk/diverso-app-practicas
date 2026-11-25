import { screen, within } from '@testing-library/react-native';
import { Platform, StyleSheet } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { FiltrosSheet, type FiltrosDelCatalogo } from '@/features/catalog/components/FiltrosSheet';

import { renderConTema } from '../../../ui/support/conTema';

/**
 * Disposición de la hoja «Filtros» en Android edge-to-edge (SDK 58): llega al borde inferior real,
 * el pie «Limpiar / Aplicar filtros» queda fijo fuera del scroll y la lista de destinos no es un
 * scroll anidado. El comportamiento (aplicar, limpiar, chips) está en `views/filtros.test.tsx`.
 */

type Nodo = { type: unknown; props: Record<string, unknown>; parent: Nodo | null };

const INSETS = { top: 24, left: 0, right: 0, bottom: 47 };
const DESTINOS = Array.from({ length: 30 }, (_, i) => `Destino ${i + 1}`);

async function abrir() {
  jest.replaceProperty(Platform, 'OS', 'android');
  const vm: FiltrosDelCatalogo = { destino: null, precioMax: null, fecha: null, destinos: DESTINOS, aplicarFiltros: jest.fn() };
  await renderConTema(
    <SafeAreaInsetsContext.Provider value={INSETS}>
      <FiltrosSheet visible vm={vm} onCerrar={jest.fn()} />
    </SafeAreaInsetsContext.Provider>,
  );
}

function ancestros(el: Nodo) {
  const lista: Nodo[] = [];
  for (let p = el.parent; p; p = p.parent) lista.push(p);
  return lista;
}
const esScroll = (n: Nodo) => n.type === 'RCTScrollView';
const estilo = (n: Nodo) => StyleSheet.flatten(n.props.style as never) ?? {};

afterEach(() => jest.restoreAllMocks());

test('el Modal dibuja bajo la barra de estado y la de navegación (edge-to-edge)', async () => {
  await abrir();

  const modal = ancestros(screen.getByTestId('filtros-sheet') as unknown as Nodo).find((n) => n.type === 'Modal')!;
  expect(modal.props.statusBarTranslucent).toBe(true);
  expect(modal.props.navigationBarTranslucent).toBe(true);
});

test('«Limpiar» y «Aplicar filtros» son un pie fijo fuera del scroll, con el inset inferior como relleno', async () => {
  await abrir();

  const pie = screen.getByTestId('filtros-pie') as unknown as Nodo;
  expect(within(pie as never).getByText('Limpiar')).toBeOnTheScreen();
  expect(within(pie as never).getByText('Aplicar filtros')).toBeOnTheScreen();
  expect(ancestros(pie).some(esScroll)).toBe(false);
  expect(ancestros(pie)).toContain(screen.getByTestId('filtros-sheet'));
  expect(estilo(pie).paddingBottom).toBe(16 + INSETS.bottom);
  // La hoja no repite el inset: lo pone el pie, pegado al borde inferior.
  expect(estilo(screen.getByTestId('filtros-sheet') as unknown as Nodo).paddingBottom ?? 0).toBe(0);
});

test('la lista de destinos no es un scroll anidado: el gesto mueve toda la hoja', async () => {
  await abrir();

  const destino = screen.getByTestId('destino-Destino 30') as unknown as Nodo;
  expect(ancestros(destino).filter(esScroll)).toHaveLength(1);
});

test('con teclado, la hoja sube con behavior="padding" también en Android', async () => {
  await abrir();

  // KeyboardAvoidingView con `padding` compone `paddingBottom` en su View; sin behavior, no.
  const teclado = screen.getByTestId('filtros-teclado') as unknown as Nodo;
  expect(estilo(teclado)).toHaveProperty('paddingBottom');
});
