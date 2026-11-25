import { fireEvent, screen, within } from '@testing-library/react-native';

import { formatFechaCorta } from '@/core';
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

async function abrir() {
  await fijarVentana(600, 1000);
  const catalogo = new CatalogoFalso({ destinosDisponibles: ['Guatapé', 'Jardín'] });
  await renderPantalla(<CatalogView />, { dependencias: dependenciasDePrueba({ catalogo }) });
  return catalogo;
}

const hoja = () => within(screen.getByTestId('filtros-sheet'));
const chips = () => screen.queryAllByTestId('input-chip');

async function abrirHoja() {
  await fireEvent.press(screen.getByRole('button', { name: 'Filtros y orden' }));
}
async function aplicar() {
  await fireEvent.press(hoja().getByText('Aplicar filtros'));
}
/** `tester.drag(Slider, Offset(-120, 0))`: baja el precio unas divisiones. */
async function bajarPrecio(divisiones = 2) {
  for (let i = 0; i < divisiones; i++) {
    await fireEvent(hoja().getByRole('adjustable'), 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });
  }
}
async function elegirDestino(nombre: string) {
  await fireEvent.press(hoja().getByTestId(`destino-${nombre}`));
}

beforeEach(reiniciarRouterFalso);
afterEach(restaurarVentana);

test('aplicar destino y precio hace una sola consulta con ambos filtros', async () => {
  const catalogo = await abrir();
  expect(catalogo.busquedas).toHaveLength(1);

  await abrirHoja();
  await elegirDestino('Guatapé');
  await bajarPrecio();
  await aplicar();

  expect(catalogo.busquedas).toHaveLength(2);
  expect(catalogo.busquedas.at(-1)!.destination).toBe('Guatapé');
  expect(catalogo.busquedas.at(-1)!.maxPrice).not.toBeNull();
  expect(chips()).toHaveLength(2);
});

test('aplicar sin cambios también hace una sola consulta', async () => {
  const catalogo = await abrir();

  await abrirHoja();
  await aplicar();

  expect(catalogo.busquedas).toHaveLength(2);
  expect(catalogo.busquedas.at(-1)!.destination).toBeNull();
  expect(catalogo.busquedas.at(-1)!.maxPrice).toBeNull();
  expect(catalogo.busquedas.at(-1)!.date).toBeNull();
});

test('Limpiar y aplicar quita los filtros con una sola consulta', async () => {
  const catalogo = await abrir();
  await abrirHoja();
  await elegirDestino('Jardín');
  await aplicar();
  expect(catalogo.busquedas.at(-1)!.destination).toBe('Jardín');
  const antes = catalogo.busquedas.length;

  await abrirHoja();
  await fireEvent.press(hoja().getByText('Limpiar'));
  await aplicar();

  expect(catalogo.busquedas).toHaveLength(antes + 1);
  expect(catalogo.busquedas.at(-1)!.destination).toBeNull();
  expect(chips()).toHaveLength(0);
});

describe('con un destino ya activo', () => {
  async function abrirConGuatape() {
    const catalogo = await abrir();
    await abrirHoja();
    await elegirDestino('Guatapé');
    await aplicar();
    expect(catalogo.busquedas.at(-1)!.destination).toBe('Guatapé');
    return catalogo;
  }

  test('cambiar solo el precio conserva el destino y su chip', async () => {
    const catalogo = await abrirConGuatape();
    const antes = catalogo.busquedas.length;

    await abrirHoja();
    await bajarPrecio();
    await aplicar();

    expect(catalogo.busquedas).toHaveLength(antes + 1);
    expect(catalogo.busquedas.at(-1)!.destination).toBe('Guatapé');
    expect(catalogo.busquedas.at(-1)!.maxPrice).not.toBeNull();
    expect(chips().some((c) => within(c).queryByText('Guatapé') !== null)).toBe(true);
  });

  test('PRESERVE: Limpiar y aplicar quita el destino activo', async () => {
    const catalogo = await abrirConGuatape();

    await abrirHoja();
    await fireEvent.press(hoja().getByText('Limpiar'));
    await aplicar();

    expect(catalogo.busquedas.at(-1)!.destination).toBeNull();
    expect(chips()).toHaveLength(0);
  });

  test('PRESERVE: elegir otro destino lo reemplaza', async () => {
    const catalogo = await abrirConGuatape();

    await abrirHoja();
    await elegirDestino('Jardín');
    await aplicar();

    expect(catalogo.busquedas.at(-1)!.destination).toBe('Jardín');
  });
});

describe('detalles de la hoja', () => {
  test('el precio arranca «Sin límite» y el máximo (600 000) vuelve a «Sin límite»', async () => {
    const catalogo = await abrir();
    await abrirHoja();
    expect(hoja().getByTestId('valor-precio')).toHaveTextContent('Sin límite');

    await bajarPrecio(1);
    expect(hoja().getByTestId('valor-precio')).toHaveTextContent('$ 550.000');

    await fireEvent(hoja().getByRole('adjustable'), 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    expect(hoja().getByTestId('valor-precio')).toHaveTextContent('Sin límite');
    await aplicar();
    expect(catalogo.busquedas.at(-1)!.maxPrice).toBeNull();
  });

  test('el deslizador va de 50 000 a 600 000 en 11 divisiones de 50 000', async () => {
    await abrir();
    await abrirHoja();

    await bajarPrecio(20);
    expect(hoja().getByTestId('valor-precio')).toHaveTextContent('$ 50.000');
    const valor = hoja().getByRole('adjustable').props.accessibilityValue;
    expect(valor).toMatchObject({ min: 50000, max: 600000, now: 50000 });
  });

  test('la insignia cuenta los filtros activos y cada chip se borra por separado', async () => {
    const catalogo = await abrir();
    expect(screen.queryByTestId('insignia-filtros')).toBeNull();
    await abrirHoja();
    await elegirDestino('Jardín');
    await bajarPrecio(3);
    await aplicar();

    expect(screen.getByTestId('insignia-filtros')).toHaveTextContent('2');
    expect(screen.getByText('Hasta $ 450.000')).toBeOnTheScreen();

    const chipPrecio = chips().find((c) => within(c).queryByText('Hasta $ 450.000') !== null)!;
    await fireEvent.press(within(chipPrecio).getByRole('button'));

    expect(catalogo.busquedas.at(-1)!.maxPrice).toBeNull();
    expect(catalogo.busquedas.at(-1)!.destination).toBe('Jardín');
    expect(screen.getByTestId('insignia-filtros')).toHaveTextContent('1');
  });

  test('el buscador de destinos filtra sin distinguir mayúsculas', async () => {
    await abrir();
    await abrirHoja();

    await fireEvent.changeText(hoja().getByLabelText('Buscar destino…'), 'JARD');

    expect(hoja().queryByTestId('destino-Guatapé')).toBeNull();
    expect(hoja().getByTestId('destino-Jardín')).toBeOnTheScreen();
    expect(hoja().getByText('Todos los destinos')).toBeOnTheScreen();
  });

  test('elegir una fecha en el calendario la aplica y «Quitar fecha» la quita de la hoja', async () => {
    const catalogo = await abrir();
    await abrirHoja();
    await fireEvent.press(hoja().getByRole('button', { name: 'Cualquier fecha' }));

    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    const calendario = within(screen.getByTestId('selector-fecha'));
    await fireEvent.press(calendario.getByText('Aceptar'));

    expect(hoja().getByRole('button', { name: formatFechaCorta(manana) })).toBeOnTheScreen();
    expect(hoja().getByRole('button', { name: 'Quitar fecha' })).toBeOnTheScreen();
    await aplicar();

    const fecha = catalogo.busquedas.at(-1)!.date!;
    expect([fecha.getFullYear(), fecha.getMonth(), fecha.getDate()]).toEqual([manana.getFullYear(), manana.getMonth(), manana.getDate()]);
    expect(screen.getByText(formatFechaCorta(manana))).toBeOnTheScreen();

    await abrirHoja();
    await fireEvent.press(hoja().getByRole('button', { name: 'Quitar fecha' }));
    expect(hoja().getByRole('button', { name: 'Cualquier fecha' })).toBeOnTheScreen();
  });
});
