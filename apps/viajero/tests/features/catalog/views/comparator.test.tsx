import { fireEvent, screen, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { ExperienceCategory, Plan, PlanStatus } from '@/core';
import { PlanComparator } from '@/features/catalog/components/PlanComparator';
import { setPlansToCompare, forgetPlansToCompare } from '@/features/catalog/plans-to-compare';
import { ComparatorView } from '@/features/catalog/views/ComparatorView';

import { CatalogoFalso } from '../../../support/catalogo-falso';
import { dependenciasDePrueba } from '../../../support/dependencias-de-prueba';
import { reiniciarRouterFalso, routerFalso } from '../../../support/expo-router-falso';
import { fijarVentana, renderPantalla, restaurarVentana } from '../../../support/pantalla';

jest.mock('expo-router', () => require('../../../support/expo-router-falso'));

/**
 * Comparador: en celulares angostos la tabla no aplasta las columnas (se desliza y el precio no
 * se parte), en pantallas anchas las reparte, marca el más barato, recalcula el total con el
 * control de viajeros, y la pantalla de `/comparar` carga por ids. Port de
 * `comparador_layout_test.dart`, el widget de `comparison_test.dart` y los estados de
 * `comparator_loader.dart`.
 */

const plan = (id: string, price: number, title = `Plan ${id} con un nombre bastante largo`) =>
  new Plan({
    id,
    agencyId: 'ag',
    title,
    destination: 'Santa Fe de Antioquia',
    category: ExperienceCategory.culture,
    priceCop: price,
    status: PlanStatus.published,
  });

const threePlans = () => [plan('1', 189000), plan('2', 178000), plan('3', 179000)];

async function renderTable(width: number, plans = threePlans()) {
  await fijarVentana(width, 1600);
  await renderPantalla(<PlanComparator plans={plans} />);
}

const widthOf = (el: { props: Record<string, unknown> }) => StyleSheet.flatten(el.props.style as never).width as number;

beforeEach(() => {
  reiniciarRouterFalso();
  forgetPlansToCompare();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(async () => {
  await restaurarVentana();
  jest.restoreAllMocks();
});

describe('tabla (comparador_layout_test)', () => {
  test('320 px y 3 planes: precio en una sola línea, columnas legibles y tabla deslizable', async () => {
    await renderTable(320);

    expect(screen.getByTestId('tabla-deslizable')).toBeOnTheScreen();
    expect(screen.getByText('Desliza la tabla para ver todos los planes')).toBeOnTheScreen();

    // El precio no se parte: una sola línea y, si no cabe, se achica.
    const price = screen.getAllByText('$ 178.000')[0]!;
    expect(price.props.numberOfLines).toBe(1);
    expect(price.props.adjustsFontSizeToFit).toBe(true);

    // Cada columna de plan conserva un ancho legible.
    expect(widthOf(screen.getAllByTestId('columna-0')[0]!)).toBeGreaterThanOrEqual(110);
  });

  test('pantalla ancha: las columnas se reparten el ancho, sin quedar angostas', async () => {
    await renderTable(900);

    expect(screen.queryByTestId('tabla-deslizable')).toBeNull();
    expect(widthOf(screen.getAllByTestId('columna-0')[0]!)).toBeGreaterThan(200);
  });

  test('el más barato se marca en su columna y cada plan tiene su botón «Ver plan»', async () => {
    await renderTable(900);

    expect(screen.getAllByText('Mejor precio')).toHaveLength(1);
    // El sello está en la cabecera de la columna del plan 2 (el más barato).
    const header2 = screen.getAllByTestId('columna-1')[0]!;
    expect(within(header2).getByText('Mejor precio')).toBeOnTheScreen();
    expect(within(header2).getByText('Plan 2 con un nombre bastante largo')).toBeOnTheScreen();
    expect(screen.getAllByText('Ver plan')).toHaveLength(3);

    await fireEvent.press(screen.getByRole('button', { name: 'Ver plan Plan 3 con un nombre bastante largo' }));
    expect(routerFalso.push).toHaveBeenCalledWith('/plan/3');
  });

  test('con empate de precio se marcan todas las columnas más baratas', async () => {
    await renderTable(900, [plan('1', 100000), plan('2', 100000), plan('3', 120000)]);
    expect(screen.getAllByText('Mejor precio')).toHaveLength(2);
  });
});

describe('control de viajeros (comparison_test)', () => {
  test('el comparador recalcula el total con el control de viajeros', async () => {
    await renderTable(900, [plan('1', 100000), plan('2', 200000)]);

    expect(screen.getByText('¿Cuántos viajan?')).toBeOnTheScreen();
    expect(screen.getByText('Total para 2 personas')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Más viajeros' }));
    expect(screen.getByText('Total para 3 personas')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Menos viajeros' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Menos viajeros' }));
    expect(screen.getByText('Total para 1 persona')).toBeOnTheScreen();

    // En 1 el botón «−» queda deshabilitado: no baja de 1.
    expect(screen.getByRole('button', { name: 'Menos viajeros' })).toBeDisabled();
    await fireEvent.press(screen.getByRole('button', { name: 'Menos viajeros' }));
    expect(screen.getByText('Total para 1 persona')).toBeOnTheScreen();
  });

  test('con menos de 2 planes avisa que no hay nada para comparar', async () => {
    await renderTable(400, [plan('1', 100000)]);
    expect(screen.getByText('Nada para comparar')).toBeOnTheScreen();
    expect(screen.getByText('Selecciona dos o tres planes en el catálogo con el ícono de comparar.')).toBeOnTheScreen();
  });
});

describe('pantalla /comparar (comparator_loader)', () => {
  async function renderComparator(ids: string[], catalog: CatalogoFalso) {
    await fijarVentana(600, 1000);
    await renderPantalla(<ComparatorView ids={ids} />, { dependencias: dependenciasDePrueba({ catalog }) });
  }
  const catalogWithPlans = () => new CatalogoFalso({ detalles: { a: plan('a', 100000), b: plan('b', 120000) } });

  test('carga los planes por id y muestra la tabla bajo «Comparar planes»', async () => {
    const catalog = catalogWithPlans();
    await renderComparator(['b', 'a'], catalog);

    expect(screen.getByText('Comparar planes')).toBeOnTheScreen();
    expect(catalog.detallesPedidos).toEqual(['b', 'a']);
    expect(screen.getByText('Elige con toda la información')).toBeOnTheScreen();
  });

  test('si el catálogo dejó los mismos planes (mismo orden) no consulta', async () => {
    const catalog = catalogWithPlans();
    setPlansToCompare([plan('a', 1), plan('b', 2)]);
    await renderComparator(['a', 'b'], catalog);

    expect(catalog.detallesPedidos).toEqual([]);
    expect(screen.getByText('Elige con toda la información')).toBeOnTheScreen();
  });

  test('error: «No pudimos cargar la comparación», «Reintentar» se recupera e «Ir al catálogo» va al inicio', async () => {
    const catalog = catalogWithPlans();
    catalog.fallo = new Error('sin red');
    await renderComparator(['a', 'b'], catalog);

    expect(screen.getByText('No pudimos cargar la comparación')).toBeOnTheScreen();
    expect(screen.getByText('No pudimos cargar los planes. Revisa tu conexión e intenta de nuevo.')).toBeOnTheScreen();

    await fireEvent.press(screen.getByText('Ir al catálogo'));
    expect(routerFalso.replace).toHaveBeenCalledWith('/');

    catalog.fallo = null;
    await fireEvent.press(screen.getByText('Reintentar'));
    expect(screen.getByText('Elige con toda la información')).toBeOnTheScreen();
  });

  test('«Volver» sin historial lleva al catálogo', async () => {
    await renderComparator([], catalogWithPlans());
    await fireEvent.press(screen.getByRole('button', { name: 'Volver' }));
    expect(routerFalso.replace).toHaveBeenCalledWith('/');
  });
});
