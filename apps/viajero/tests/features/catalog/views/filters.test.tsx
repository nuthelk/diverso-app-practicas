import { fireEvent, screen, within } from '@testing-library/react-native';

import { formatShortDate } from '@/core';
import { CatalogView } from '@/features/catalog/views/CatalogView';

import { CatalogoFalso } from '../../../support/catalogo-falso';
import { dependenciasDePrueba } from '../../../support/dependencias-de-prueba';
import { reiniciarRouterFalso } from '../../../support/expo-router-falso';
import { fijarVentana, renderPantalla, restaurarVentana } from '../../../support/pantalla';

jest.mock('expo-router', () => require('../../../support/expo-router-falso'));

/**
 * Hoja de filtros del catálogo: «Aplicar filtros» aplica destino, precio y fecha juntos con UNA
 * sola consulta. Sin red: el catálogo es un doble que cuenta. Port 1:1 de `filtros_test.dart`
 * (+ insignia, «Sin límite», fecha y chips que se borran).
 */

async function renderCatalog() {
  await fijarVentana(600, 1000);
  const catalog = new CatalogoFalso({ destinosDisponibles: ['Guatapé', 'Jardín'] });
  await renderPantalla(<CatalogView />, { dependencias: dependenciasDePrueba({ catalog }) });
  return catalog;
}

const sheet = () => within(screen.getByTestId('filtros-sheet'));
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
  await fireEvent.press(sheet().getByTestId(`destino-${name}`));
}

beforeEach(reiniciarRouterFalso);
afterEach(restaurarVentana);

test('aplicar destino y precio hace una sola consulta con ambos filtros', async () => {
  const catalog = await renderCatalog();
  expect(catalog.busquedas).toHaveLength(1);

  await openSheet();
  await pickDestination('Guatapé');
  await lowerPrice();
  await apply();

  expect(catalog.busquedas).toHaveLength(2);
  expect(catalog.busquedas.at(-1)!.destination).toBe('Guatapé');
  expect(catalog.busquedas.at(-1)!.maxPrice).not.toBeNull();
  expect(chips()).toHaveLength(2);
});

test('aplicar sin cambios también hace una sola consulta', async () => {
  const catalog = await renderCatalog();

  await openSheet();
  await apply();

  expect(catalog.busquedas).toHaveLength(2);
  expect(catalog.busquedas.at(-1)!.destination).toBeNull();
  expect(catalog.busquedas.at(-1)!.maxPrice).toBeNull();
  expect(catalog.busquedas.at(-1)!.date).toBeNull();
});

test('Limpiar y aplicar quita los filtros con una sola consulta', async () => {
  const catalog = await renderCatalog();
  await openSheet();
  await pickDestination('Jardín');
  await apply();
  expect(catalog.busquedas.at(-1)!.destination).toBe('Jardín');
  const before = catalog.busquedas.length;

  await openSheet();
  await fireEvent.press(sheet().getByText('Limpiar'));
  await apply();

  expect(catalog.busquedas).toHaveLength(before + 1);
  expect(catalog.busquedas.at(-1)!.destination).toBeNull();
  expect(chips()).toHaveLength(0);
});

describe('con un destino ya activo', () => {
  async function renderWithGuatape() {
    const catalog = await renderCatalog();
    await openSheet();
    await pickDestination('Guatapé');
    await apply();
    expect(catalog.busquedas.at(-1)!.destination).toBe('Guatapé');
    return catalog;
  }

  test('cambiar solo el precio conserva el destino y su chip', async () => {
    const catalog = await renderWithGuatape();
    const before = catalog.busquedas.length;

    await openSheet();
    await lowerPrice();
    await apply();

    expect(catalog.busquedas).toHaveLength(before + 1);
    expect(catalog.busquedas.at(-1)!.destination).toBe('Guatapé');
    expect(catalog.busquedas.at(-1)!.maxPrice).not.toBeNull();
    expect(chips().some((c) => within(c).queryByText('Guatapé') !== null)).toBe(true);
  });

  test('PRESERVE: Limpiar y aplicar quita el destino activo', async () => {
    const catalog = await renderWithGuatape();

    await openSheet();
    await fireEvent.press(sheet().getByText('Limpiar'));
    await apply();

    expect(catalog.busquedas.at(-1)!.destination).toBeNull();
    expect(chips()).toHaveLength(0);
  });

  test('PRESERVE: elegir otro destino lo reemplaza', async () => {
    const catalog = await renderWithGuatape();

    await openSheet();
    await pickDestination('Jardín');
    await apply();

    expect(catalog.busquedas.at(-1)!.destination).toBe('Jardín');
  });
});

describe('detalles de la hoja', () => {
  test('el precio arranca «Sin límite» y el máximo (600 000) vuelve a «Sin límite»', async () => {
    const catalog = await renderCatalog();
    await openSheet();
    expect(sheet().getByTestId('valor-precio')).toHaveTextContent('Sin límite');

    await lowerPrice(1);
    expect(sheet().getByTestId('valor-precio')).toHaveTextContent('$ 550.000');

    await fireEvent(sheet().getByRole('adjustable'), 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    expect(sheet().getByTestId('valor-precio')).toHaveTextContent('Sin límite');
    await apply();
    expect(catalog.busquedas.at(-1)!.maxPrice).toBeNull();
  });

  test('el deslizador va de 50 000 a 600 000 en 11 divisiones de 50 000', async () => {
    await renderCatalog();
    await openSheet();

    await lowerPrice(20);
    expect(sheet().getByTestId('valor-precio')).toHaveTextContent('$ 50.000');
    const value = sheet().getByRole('adjustable').props.accessibilityValue;
    expect(value).toMatchObject({ min: 50000, max: 600000, now: 50000 });
  });

  test('la insignia cuenta los filtros activos y cada chip se borra por separado', async () => {
    const catalog = await renderCatalog();
    expect(screen.queryByTestId('insignia-filtros')).toBeNull();
    await openSheet();
    await pickDestination('Jardín');
    await lowerPrice(3);
    await apply();

    expect(screen.getByTestId('insignia-filtros')).toHaveTextContent('2');
    expect(screen.getByText('Hasta $ 450.000')).toBeOnTheScreen();

    const priceChip = chips().find((c) => within(c).queryByText('Hasta $ 450.000') !== null)!;
    await fireEvent.press(within(priceChip).getByRole('button'));

    expect(catalog.busquedas.at(-1)!.maxPrice).toBeNull();
    expect(catalog.busquedas.at(-1)!.destination).toBe('Jardín');
    expect(screen.getByTestId('insignia-filtros')).toHaveTextContent('1');
  });

  test('el buscador de destinos filtra sin distinguir mayúsculas', async () => {
    await renderCatalog();
    await openSheet();

    await fireEvent.changeText(sheet().getByLabelText('Buscar destino…'), 'JARD');

    expect(sheet().queryByTestId('destino-Guatapé')).toBeNull();
    expect(sheet().getByTestId('destino-Jardín')).toBeOnTheScreen();
    expect(sheet().getByText('Todos los destinos')).toBeOnTheScreen();
  });

  test('elegir una fecha en el calendario la aplica y «Quitar fecha» la quita de la hoja', async () => {
    const catalog = await renderCatalog();
    await openSheet();
    await fireEvent.press(sheet().getByRole('button', { name: 'Cualquier fecha' }));

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const calendar = within(screen.getByTestId('selector-fecha'));
    await fireEvent.press(calendar.getByText('Aceptar'));

    expect(sheet().getByRole('button', { name: formatShortDate(tomorrow) })).toBeOnTheScreen();
    expect(sheet().getByRole('button', { name: 'Quitar fecha' })).toBeOnTheScreen();
    await apply();

    const date = catalog.busquedas.at(-1)!.date!;
    expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate()]);
    expect(screen.getByText(formatShortDate(tomorrow))).toBeOnTheScreen();

    await openSheet();
    await fireEvent.press(sheet().getByRole('button', { name: 'Quitar fecha' }));
    expect(sheet().getByRole('button', { name: 'Cualquier fecha' })).toBeOnTheScreen();
  });
});
