import { router } from 'expo-router';
import { act, fireEvent, screen, within } from 'expo-router/testing-library';

import { AgencySummary, ExperienceCategory, Plan, PlanStatus } from '@/core';

import { startApp, settle } from '../../../support/app';
import { FakeCatalogRepository, FakeReviews } from '../../../support/fake-catalog-repository';
import { createGate } from '../../../support/gate';
import { testDependencies } from '../../../support/test-dependencies';
import { setWindowSize, restoreWindowSize } from '../../../support/render-screen';

/**
 * Pestaña «Agencias» y página `/agencia/:id` con el router real: lista con puntaje («Nueva» sin
 * reseñas), iniciales, orden elegible, estados de carga/vacío/error, recarga, y la página de una
 * agencia con sus planes. Sin red: el catálogo es un doble. Port de `agencias_test.dart` (el grupo
 * «logo» y el color estable por agencia ya los cubre `tests/ui/components/AgencyAvatar.test.tsx`).
 */

const rutas = new AgencySummary({
  id: 'ag-rutas',
  name: 'Rutas de Antioquia Cultural',
  city: 'Medellín',
  description: 'Cultura, memoria y patrimonio de Antioquia.',
  planCount: 2,
  rating: 4.5,
  reviewsTotal: 2,
});
const eco = new AgencySummary({ id: 'ag-eco', name: 'EcoAndes Viajes', city: 'Envigado', planCount: 5 });
const cafe = new AgencySummary({
  id: 'ag-cafe',
  name: 'Café y Montaña Tours',
  city: 'Jardín',
  planCount: 3,
  rating: 5.0,
  reviewsTotal: 3,
});

const plan = (id: string, title: string) =>
  new Plan({
    id,
    agencyId: 'ag-rutas',
    title,
    destination: 'Guatapé',
    category: ExperienceCategory.culture,
    priceCop: 120000,
    status: PlanStatus.published,
    averageRating: 3.0,
    reviewsCount: 1,
  });

function testCatalog(list = [rutas, eco, cafe]) {
  return new FakeCatalogRepository({
    publicAgencies: list,
    plansByAgency: { 'ag-rutas': [plan('plan-1', 'Comuna 13 y memoria'), plan('plan-2', 'Santa Fe de Antioquia')] },
    details: { 'plan-1': plan('plan-1', 'Comuna 13 y memoria') },
  });
}

async function openAt(catalog: FakeCatalogRepository, url = '/agencias') {
  // 600 de ancho: lista de una columna.
  await setWindowSize(600, 1400);
  return startApp(url, testDependencies({ catalog, reviews: new FakeReviews() as never }));
}

/** Nombres de las agencias de la lista, de arriba abajo (orden en el árbol). */
function namesOnScreen() {
  const all = [rutas, eco, cafe];
  return screen
    .getAllByTestId(/^agencia-card-/)
    .map((el) => all.find((a) => el.props.testID === `agencia-card-${a.id}`)?.name);
}

beforeEach(() => jest.spyOn(console, 'warn').mockImplementation(() => {}));
afterEach(async () => {
  await restoreWindowSize();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('lista de agencias', () => {
  test('cada agencia muestra iniciales (sin logo), puntaje o «Nueva», ciudad, planes y sello', async () => {
    await openAt(testCatalog());

    expect(screen.getAllByText('Agencias').length).toBeGreaterThanOrEqual(1); // título y destino de la barra
    expect(screen.getByText('Rutas de Antioquia Cultural')).toBeOnTheScreen();
    // Sin logo_url: iniciales en un círculo de color.
    expect(screen.getByText('RA')).toBeOnTheScreen();
    expect(screen.getByText('EV')).toBeOnTheScreen();
    expect(screen.getByText('CM')).toBeOnTheScreen();
    // Con reseñas: ★ puntaje y cantidad. Sin reseñas: «Nueva», nunca 0.
    expect(screen.getByText('4.5')).toBeOnTheScreen();
    expect(screen.getByText('(2)')).toBeOnTheScreen();
    expect(screen.getByText('Nueva')).toBeOnTheScreen();
    expect(screen.queryByText('0.0')).toBeNull();
    expect(screen.getByText('Medellín')).toBeOnTheScreen();
    expect(screen.getByText('2 planes')).toBeOnTheScreen();
    expect(screen.getByText('5 planes')).toBeOnTheScreen();
    expect(screen.getAllByText('Verificada RNT')).toHaveLength(3);
  });

  test('por defecto va por puntaje y el control cambia el orden', async () => {
    await openAt(testCatalog());
    // Puntaje: 5.0, 4.5 y al final la «Nueva».
    expect(namesOnScreen()).toEqual(['Café y Montaña Tours', 'Rutas de Antioquia Cultural', 'EcoAndes Viajes']);
    for (const label of ['Puntaje', 'Más planes', 'Nombre']) expect(screen.getByText(label)).toBeOnTheScreen();
    // Sin ✓ en el segmento elegido.
    expect(screen.queryByTestId('icono-check_rounded', { includeHiddenElements: true })).toBeNull();

    await fireEvent.press(screen.getByText('Más planes'));
    expect(namesOnScreen()).toEqual(['EcoAndes Viajes', 'Café y Montaña Tours', 'Rutas de Antioquia Cultural']);

    await fireEvent.press(screen.getByText('Nombre'));
    expect(namesOnScreen()).toEqual(['Café y Montaña Tours', 'EcoAndes Viajes', 'Rutas de Antioquia Cultural']);
  });

  test('muestra esqueletos mientras carga', async () => {
    const catalog = testCatalog([rutas]);
    const gate = (catalog.gate = createGate());
    await openAt(catalog);
    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
    expect(screen.queryByText('Rutas de Antioquia Cultural')).toBeNull();

    await act(async () => gate.resolve());
    await settle();
    expect(screen.queryAllByTestId('skeleton')).toHaveLength(0);
    expect(screen.getByText('Rutas de Antioquia Cultural')).toBeOnTheScreen();
  });

  test('sin agencias muestra el estado vacío', async () => {
    await openAt(testCatalog([]));
    expect(screen.getByText('Aún no hay agencias')).toBeOnTheScreen();
  });

  test('si falla muestra el error y «Reintentar» vuelve a cargar', async () => {
    const catalog = testCatalog();
    catalog.failure = new Error('sin red');
    await openAt(catalog);
    expect(screen.getByText('Sin conexión')).toBeOnTheScreen();
    expect(screen.getByText(/No pudimos cargar las agencias/)).toBeOnTheScreen();

    catalog.failure = null;
    await fireEvent.press(screen.getByText('Reintentar'));
    await settle();
    expect(screen.queryByText('Sin conexión')).toBeNull();
    expect(screen.getByText('Rutas de Antioquia Cultural')).toBeOnTheScreen();
  });

  test('deslizar hacia abajo recarga la lista', async () => {
    const catalog = testCatalog();
    await openAt(catalog);
    expect(catalog.agencyQueries).toBe(1);

    const refreshControl = screen.getByTestId('agencias-scroll').props.refreshControl;
    await act(async () => refreshControl.props.onRefresh());
    expect(catalog.agencyQueries).toBe(2);
  });

  test('tocar una agencia abre su página', async () => {
    const r = await openAt(testCatalog());
    await fireEvent.press(screen.getByText('Rutas de Antioquia Cultural'));
    await settle();
    expect(r.getPathname()).toBe('/agencia/ag-rutas');
    expect(screen.getByText('PLANES PUBLICADOS (2)')).toBeOnTheScreen();
  });
});

describe('página de agencia', () => {
  test('/agencia/:id carga por id y muestra sus datos y sus planes', async () => {
    await openAt(testCatalog(), '/agencia/ag-rutas');
    const page = within(screen.getByTestId('pantalla-AgenciaView'));
    expect(page.getAllByText('Rutas de Antioquia Cultural').length).toBeGreaterThanOrEqual(1);
    expect(page.getByText('RA')).toBeOnTheScreen();
    expect(page.getByText('4.5')).toBeOnTheScreen();
    expect(page.getByText('Medellín')).toBeOnTheScreen();
    expect(page.getByText('Cultura, memoria y patrimonio de Antioquia.')).toBeOnTheScreen();
    expect(page.getAllByText('Verificada RNT')).toHaveLength(1);
    expect(page.getByText('PLANES PUBLICADOS (2)')).toBeOnTheScreen();
    expect(page.getByText('Comuna 13 y memoria')).toBeOnTheScreen();
    expect(page.getByText('Santa Fe de Antioquia')).toBeOnTheScreen();
    // Aquí no se compara: el botón del comparador no aparece en las tarjetas.
    expect(page.queryByRole('button', { name: 'Agregar al comparador' })).toBeNull();
  });

  test('tocar un plan abre /plan/:id como en el catálogo', async () => {
    const r = await openAt(testCatalog(), '/agencia/ag-rutas');
    await fireEvent.press(screen.getByText('Comuna 13 y memoria'));
    await settle();
    expect(r.getPathname()).toBe('/plan/plan-1');
  });

  test('una agencia «Nueva» sin planes muestra «Nueva» y no se rompe', async () => {
    await openAt(testCatalog(), '/agencia/ag-eco');
    expect(screen.getByText('Nueva')).toBeOnTheScreen();
    expect(screen.getByText('Esta agencia no tiene planes disponibles por ahora.')).toBeOnTheScreen();
  });

  test('un id que no existe avisa en vez de quedar en blanco', async () => {
    await openAt(testCatalog(), '/agencia/nope');
    expect(screen.getByText('Agencia no disponible')).toBeOnTheScreen();
    expect(screen.getByText('Esta agencia no existe o ya no tiene planes publicados.')).toBeOnTheScreen();
  });

  test('si falla la carga ofrece reintentar', async () => {
    const catalog = testCatalog();
    catalog.failure = new Error('sin red');
    await openAt(catalog, '/agencia/ag-rutas');
    expect(screen.getByText('No pudimos cargar la agencia')).toBeOnTheScreen();
    catalog.failure = null;
    await fireEvent.press(screen.getByText('Reintentar'));
    await settle();
    expect(screen.getByText('Comuna 13 y memoria')).toBeOnTheScreen();
  });

  test('tras recargar (sin historial) «Volver» lleva a la lista de agencias', async () => {
    const r = await openAt(testCatalog(), '/agencia/ag-rutas');
    await fireEvent.press(screen.getByRole('button', { name: 'Volver' }));
    await settle();
    expect(r.getPathname()).toBe('/agencias');
    expect(screen.getByText('Café y Montaña Tours')).toBeOnTheScreen();
  });

  test('desde la lista, «Volver» regresa a la lista', async () => {
    const r = await openAt(testCatalog());
    await fireEvent.press(screen.getByText('Rutas de Antioquia Cultural'));
    await settle();
    expect(router.canGoBack()).toBe(true);
    await fireEvent.press(within(screen.getByTestId('pantalla-AgenciaView')).getByRole('button', { name: 'Volver' }));
    await settle();
    expect(r.getPathname()).toBe('/agencias');
  });
});
