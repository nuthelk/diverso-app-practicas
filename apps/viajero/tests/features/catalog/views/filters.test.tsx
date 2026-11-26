import { fireEvent, screen, within } from '@testing-library/react-native';

import { formatShortDate } from '@/core';
import { CatalogView } from '@/features/catalog/views/CatalogView';

import { FakeCatalogRepository } from '../../../support/fake-catalog-repository';
import { testDependencies } from '../../../support/test-dependencies';
import { resetFakeRouter } from '../../../support/fake-expo-router';
import { setWindowSize, renderScreen, restoreWindowSize } from '../../../support/render-screen';

jest.mock('expo-router', () => require('../../../support/fake-expo-router'));

/**
 * Hoja de filtros del catálogo: «Aplicar filtros» aplica destino, precio y fecha juntos con UNA
 * sola consulta. Sin red: el catálogo es un doble que cuenta. Port 1:1 de `filtros_test.dart`
 * (+ insignia, «Sin límite», fecha y chips que se borran).
 */

async function renderCatalog() {
  await setWindowSize(600, 1000);
  const catalog = new FakeCatalogRepository({ availableDestinations: ['Guatapé', 'Jardín'] });
  await renderScreen(<CatalogView />, { dependencies: testDependencies({ catalog }) });
  return catalog;
}

const sheet = () => within(screen.getByTestId('filters-sheet'));
const chips = () => screen.queryAllByTestId('input-chip');

async function openSheet() {
  await fireEvent.press(screen.getByRole('button', { name: 'Filtros y orden' }));
}
async function apply() {
  await fireEvent.press(sheet().getByText('Aplicar filtros'));
}
/** `tester.drag(Slider, Offset(-120, 0))`: baja el precio unas divisiones. */
async function lowerPrice(steps = 2) {
  for (let i = 0; i < steps; i++) {
    await fireEvent(sheet().getByRole('adjustable'), 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });
  }
}
async function pickDestination(name: string) {
  await fireEvent.press(sheet().getByTestId(`destination-${name}`));
}

beforeEach(resetFakeRouter);
afterEach(restoreWindowSize);

test('aplicar destino y precio hace una sola consulta con ambos filtros', async () => {
  const catalog = await renderCatalog();
  expect(catalog.searches).toHaveLength(1);

  await openSheet();
  await pickDestination('Guatapé');
  await lowerPrice();
  await apply();

  expect(catalog.searches).toHaveLength(2);
  expect(catalog.searches.at(-1)!.destination).toBe('Guatapé');
  expect(catalog.searches.at(-1)!.maxPrice).not.toBeNull();
  expect(chips()).toHaveLength(2);
});

test('aplicar sin cambios también hace una sola consulta', async () => {
  const catalog = await renderCatalog();

  await openSheet();
  await apply();

  expect(catalog.searches).toHaveLength(2);
  expect(catalog.searches.at(-1)!.destination).toBeNull();
  expect(catalog.searches.at(-1)!.maxPrice).toBeNull();
  expect(catalog.searches.at(-1)!.date).toBeNull();
});

test('Limpiar y aplicar quita los filtros con una sola consulta', async () => {
  const catalog = await renderCatalog();
  await openSheet();
  await pickDestination('Jardín');
  await apply();
  expect(catalog.searches.at(-1)!.destination).toBe('Jardín');
  const before = catalog.searches.length;

  await openSheet();
  await fireEvent.press(sheet().getByText('Limpiar'));
  await apply();

  expect(catalog.searches).toHaveLength(before + 1);
  expect(catalog.searches.at(-1)!.destination).toBeNull();
  expect(chips()).toHaveLength(0);
});

describe('con un destino ya activo', () => {
  async function renderWithGuatape() {
    const catalog = await renderCatalog();
    await openSheet();
    await pickDestination('Guatapé');
    await apply();
    expect(catalog.searches.at(-1)!.destination).toBe('Guatapé');
    return catalog;
  }

  test('cambiar solo el precio conserva el destino y su chip', async () => {
    const catalog = await renderWithGuatape();
    const before = catalog.searches.length;

    await openSheet();
    await lowerPrice();
    await apply();

    expect(catalog.searches).toHaveLength(before + 1);
    expect(catalog.searches.at(-1)!.destination).toBe('Guatapé');
    expect(catalog.searches.at(-1)!.maxPrice).not.toBeNull();
    expect(chips().some((c) => within(c).queryByText('Guatapé') !== null)).toBe(true);
  });

  test('PRESERVE: Limpiar y aplicar quita el destino activo', async () => {
    const catalog = await renderWithGuatape();

    await openSheet();
    await fireEvent.press(sheet().getByText('Limpiar'));
    await apply();

    expect(catalog.searches.at(-1)!.destination).toBeNull();
    expect(chips()).toHaveLength(0);
  });

  test('PRESERVE: elegir otro destino lo reemplaza', async () => {
    const catalog = await renderWithGuatape();

    await openSheet();
    await pickDestination('Jardín');
    await apply();

    expect(catalog.searches.at(-1)!.destination).toBe('Jardín');
  });
});

describe('detalles de la hoja', () => {
  test('el precio arranca «Sin límite» y el máximo (600 000) vuelve a «Sin límite»', async () => {
    const catalog = await renderCatalog();
    await openSheet();
    expect(sheet().getByTestId('price-value')).toHaveTextContent('Sin límite');

    await lowerPrice(1);
    expect(sheet().getByTestId('price-value')).toHaveTextContent('$ 550.000');

    await fireEvent(sheet().getByRole('adjustable'), 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    expect(sheet().getByTestId('price-value')).toHaveTextContent('Sin límite');
    await apply();
    expect(catalog.searches.at(-1)!.maxPrice).toBeNull();
  });

  test('el deslizador va de 50 000 a 600 000 en 11 divisiones de 50 000', async () => {
    await renderCatalog();
    await openSheet();

    await lowerPrice(20);
    expect(sheet().getByTestId('price-value')).toHaveTextContent('$ 50.000');
    const value = sheet().getByRole('adjustable').props.accessibilityValue;
    expect(value).toMatchObject({ min: 50000, max: 600000, now: 50000 });
  });

  test('la insignia cuenta los filtros activos y cada chip se borra por separado', async () => {
    const catalog = await renderCatalog();
    expect(screen.queryByTestId('filters-badge')).toBeNull();
    await openSheet();
    await pickDestination('Jardín');
    await lowerPrice(3);
    await apply();

    expect(screen.getByTestId('filters-badge')).toHaveTextContent('2');
    expect(screen.getByText('Hasta $ 450.000')).toBeOnTheScreen();

    const priceChip = chips().find((c) => within(c).queryByText('Hasta $ 450.000') !== null)!;
    await fireEvent.press(within(priceChip).getByRole('button'));

    expect(catalog.searches.at(-1)!.maxPrice).toBeNull();
    expect(catalog.searches.at(-1)!.destination).toBe('Jardín');
    expect(screen.getByTestId('filters-badge')).toHaveTextContent('1');
  });

  test('el buscador de destinos filtra sin distinguir mayúsculas', async () => {
    await renderCatalog();
    await openSheet();

    await fireEvent.changeText(sheet().getByLabelText('Buscar destino…'), 'JARD');

    expect(sheet().queryByTestId('destination-Guatapé')).toBeNull();
    expect(sheet().getByTestId('destination-Jardín')).toBeOnTheScreen();
    expect(sheet().getByText('Todos los destinos')).toBeOnTheScreen();
  });

  test('elegir una fecha en el calendario la aplica y «Quitar fecha» la quita de la hoja', async () => {
    const catalog = await renderCatalog();
    await openSheet();
    await fireEvent.press(sheet().getByRole('button', { name: 'Cualquier fecha' }));

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const calendar = within(screen.getByTestId('date-picker'));
    await fireEvent.press(calendar.getByText('Aceptar'));

    expect(sheet().getByRole('button', { name: formatShortDate(tomorrow) })).toBeOnTheScreen();
    expect(sheet().getByRole('button', { name: 'Quitar fecha' })).toBeOnTheScreen();
    await apply();

    const date = catalog.searches.at(-1)!.date!;
    expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate()]);
    expect(screen.getByText(formatShortDate(tomorrow))).toBeOnTheScreen();

    await openSheet();
    await fireEvent.press(sheet().getByRole('button', { name: 'Quitar fecha' }));
    expect(sheet().getByRole('button', { name: 'Cualquier fecha' })).toBeOnTheScreen();
  });
});
