import { act, fireEvent, screen, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { ExperienceCategory, formatCOP, Plan, PlanStatus } from '@/core';
import { CompareTray } from '@/features/catalog/components/CompareTray';
import { forgetPlansToCompare, plansToCompare } from '@/features/catalog/plans-to-compare';
import { CatalogView } from '@/features/catalog/views/CatalogView';

import { CatalogoFalso } from '../../../support/catalogo-falso';
import { dependenciasDePrueba } from '../../../support/dependencias-de-prueba';
import { reiniciarRouterFalso, routerFalso } from '../../../support/expo-router-falso';
import { fijarVentana, renderPantalla, restaurarVentana } from '../../../support/pantalla';
import { renderWithTheme } from '../../../ui/support/render-with-theme';

jest.mock('expo-router', () => require('../../../support/expo-router-falso'));

/**
 * Bandeja de comparación del catálogo: oculta sin selección, con pista y botón deshabilitado con
 * un solo plan, «Comparar (n)» activo desde dos, miniaturas que se quitan con ✕, «Limpiar», tope
 * de planes y lista que nunca queda tapada. Port 1:1 de `bandeja_comparar_test.dart`.
 */

const plan = (i: number) =>
  new Plan({
    id: `plan-${i}`,
    agencyId: 'ag',
    title: `Plan ${i}`,
    destination: 'Guatapé',
    category: ExperienceCategory.culture,
    priceCop: 100000 + i,
    status: PlanStatus.published,
    photos: ['https://fotos.test/p.jpg'],
    averageRating: 4.0,
    reviewsCount: 3,
  });

async function renderCatalog({ planCount = 4 }: { planCount?: number } = {}) {
  // 600 de ancho: lista de una columna y espacio para tres miniaturas junto al botón.
  await fijarVentana(600, 1000);
  const catalog = new CatalogoFalso({ planes: Array.from({ length: planCount }, (_, i) => plan(i + 1)) });
  await renderPantalla(<CatalogView />, { dependencias: dependenciasDePrueba({ catalogo: catalog }) });
}

/** Deja correr la animación de la bandeja (220 ms). */
async function runAnimation() {
  await act(async () => {
    jest.advanceTimersByTime(400);
  });
}

async function addToCompare() {
  await fireEvent.press(screen.getAllByRole('button', { name: 'Agregar al comparador' })[0]!);
  await runAnimation();
}

const tray = () => screen.queryByTestId('bandeja-comparar');
const inTray = () => within(screen.getByTestId('bandeja-comparar'));
const compareButton = () => inTray().getByTestId('boton-comparar');

beforeEach(() => {
  jest.useFakeTimers();
  reiniciarRouterFalso();
  forgetPlansToCompare();
});
afterEach(async () => {
  await restaurarVentana();
  jest.useRealTimers();
});

test('sin planes elegidos no hay bandeja', async () => {
  await renderCatalog();

  expect(tray()).toBeNull();
  expect(screen.queryByText('Limpiar')).toBeNull();
});

test('con 1 plan: contador, pista y «Comparar (1)» deshabilitado', async () => {
  await renderCatalog();
  await addToCompare();

  expect(tray()).toBeOnTheScreen();
  expect(inTray().getByText('1 de 3 planes')).toBeOnTheScreen();
  expect(inTray().getByText('Elige al menos 2 planes')).toBeOnTheScreen();
  expect(inTray().getByText('Plan 1')).toBeOnTheScreen(); // miniatura con su título
  expect(inTray().getByText('Limpiar')).toBeOnTheScreen();
  expect(compareButton()).toBeDisabled();
  expect(inTray().getByText('Comparar (1)')).toBeOnTheScreen();

  // Tocar el botón deshabilitado no navega.
  await fireEvent.press(compareButton());
  expect(routerFalso.push).not.toHaveBeenCalled();
});

test('con 2 planes: «Comparar (2)» activo, sin pista, y abre el comparador con ellos', async () => {
  await renderCatalog();
  await addToCompare();
  await addToCompare();

  expect(inTray().getByText('2 de 3 planes')).toBeOnTheScreen();
  expect(inTray().queryByText('Elige al menos 2 planes')).toBeNull();
  expect(inTray().getByText('Comparar (2)')).toBeOnTheScreen();
  expect(compareButton()).toBeEnabled();

  await fireEvent.press(compareButton());
  expect(routerFalso.push).toHaveBeenCalledWith('/comparar?ids=plan-1,plan-2');
  // El `extra`: los planes que ya se tenían viajan en memoria.
  expect(plansToCompare()!.map((p) => p.id)).toEqual(['plan-1', 'plan-2']);
});

test('la ✕ de una miniatura quita ese plan y vuelve la pista', async () => {
  await renderCatalog();
  await addToCompare();
  await addToCompare();

  await fireEvent.press(screen.getByRole('button', { name: 'Quitar Plan 1 de la comparación' }));
  await runAnimation();

  expect(inTray().getByText('1 de 3 planes')).toBeOnTheScreen();
  expect(inTray().queryByText('Plan 1')).toBeNull();
  expect(inTray().getByText('Plan 2')).toBeOnTheScreen();
  expect(inTray().getByText('Elige al menos 2 planes')).toBeOnTheScreen();
  expect(compareButton()).toBeDisabled();
  // La tarjeta del plan quitado vuelve a poder agregarse.
  expect(screen.getAllByRole('button', { name: 'Agregar al comparador' }).length).toBeGreaterThan(0);
});

test('«Limpiar» vacía la selección y la bandeja desaparece', async () => {
  await renderCatalog();
  await addToCompare();
  await addToCompare();

  await fireEvent.press(inTray().getByText('Limpiar'));
  await runAnimation();

  expect(tray()).toBeNull();
  expect(screen.queryByRole('button', { name: 'Quitar del comparador' })).toBeNull();
});

test('respeta el máximo de 3: el cuarto plan no entra', async () => {
  await renderCatalog();
  for (let i = 0; i < 3; i++) await addToCompare();
  expect(inTray().getByText('3 de 3 planes')).toBeOnTheScreen();
  expect(inTray().getByText('Máximo 3 planes')).toBeOnTheScreen();

  await addToCompare(); // intento del cuarto

  expect(inTray().getByText('3 de 3 planes')).toBeOnTheScreen();
  expect(inTray().queryByText('Plan 4')).toBeNull();
  expect(inTray().getByText('Comparar (3)')).toBeOnTheScreen();
});

test('la bandeja queda debajo de la lista (no superpuesta): no tapa el final', async () => {
  await renderCatalog({ planCount: 6 });
  await addToCompare();

  const scroll = screen.getByTestId('catalogo-scroll');
  // El último precio está en la lista; la bandeja, fuera del scroll y sin posición absoluta.
  expect(within(scroll).getByText(formatCOP(100006))).toBeOnTheScreen();
  expect(within(scroll).queryByTestId('bandeja-comparar')).toBeNull();
  const view = screen.getByTestId('pantalla-CatalogView');
  const children = view.children as { props: { testID?: string } }[];
  const indexOf = (pred: (h: { props: { testID?: string } }) => boolean) => children.findIndex(pred);
  expect(indexOf((h) => h.props.testID === 'catalogo-scroll')).toBeLessThan(children.length - 1);
  expect(StyleSheet.flatten(screen.getByTestId('bandeja-comparar').props.style).position).toBeUndefined();
});

test('los lugares libres miden lo mismo que una miniatura, con su «+» decorativo', async () => {
  await renderCatalog();
  await addToCompare();

  const heightOf = (el: { props: Record<string, unknown> }) => StyleSheet.flatten(el.props.style as never).height;
  const photo = inTray().getByTestId('foto-miniatura');
  const slots = inTray().getAllByTestId('hueco-bandeja', { includeHiddenElements: true });
  expect(slots).toHaveLength(2); // 3 lugares, 1 ocupado
  for (const h of slots) expect(heightOf(h)).toBe(heightOf(photo));
  expect(heightOf(photo)).toBeGreaterThan(40); // no son cápsulas angostas
  expect(within(slots[0]!).getByTestId('icono-add_rounded', { includeHiddenElements: true })).toBeTruthy();
  // Decorativo: sin semántica ni foco.
  const slot = inTray().getAllByTestId('hueco', { includeHiddenElements: true })[0]!;
  expect(slot.props.importantForAccessibility).toBe('no-hide-descendants');
  expect(slot.props.accessibilityElementsHidden).toBe(true);
  expect(within(slot).queryAllByRole('button', { includeHiddenElements: true })).toHaveLength(0);
});

test('accesible: cada ✕ y cada botón tienen etiqueta', async () => {
  await renderCatalog();
  await addToCompare();

  const removeButton = screen.getByRole('button', { name: 'Quitar Plan 1 de la comparación' });
  expect(removeButton).toBeOnTheScreen();
  expect(inTray().getByRole('button', { name: 'Limpiar' })).toBeOnTheScreen();
  expect(inTray().getByRole('button', { name: 'Comparar (1)' })).toBeOnTheScreen();
});

test('no suma el inset inferior del sistema: la barra de pestañas ya está debajo y lo consume', async () => {
  // Inset de la barra de gestos (~47 dp en el emulador): antes quedaba como franja vacía.
  const insets = { top: 24, left: 0, right: 0, bottom: 47 };
  await renderWithTheme(
    <SafeAreaInsetsContext.Provider value={insets}>
      <CompareTray selection={[plan(1)]} max={3} onRemove={jest.fn()} onClear={jest.fn()} onCompare={jest.fn()} />
    </SafeAreaInsetsContext.Provider>,
  );

  expect(StyleSheet.flatten(screen.getByTestId('bandeja-comparar').props.style).paddingBottom).toBe(14);
});

test('«Limpiar» vacía la selección y la bandeja se va (no queda congelada con la selección vieja)', async () => {
  await renderCatalog();
  await addToCompare();
  expect(tray()).toBeOnTheScreen();

  await fireEvent.press(inTray().getByText('Limpiar'));
  await runAnimation();

  expect(screen.getAllByRole('button', { name: 'Agregar al comparador' })).toHaveLength(4);
  expect(tray()).toBeNull();
});

test('quitar el único plan con su ✕ también cierra la bandeja', async () => {
  await renderCatalog();
  await addToCompare();

  await fireEvent.press(inTray().getByRole('button', { name: 'Quitar Plan 1 de la comparación' }));
  await runAnimation();

  expect(tray()).toBeNull();
});
