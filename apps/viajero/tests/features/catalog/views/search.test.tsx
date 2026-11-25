import { fireEvent, screen } from '@testing-library/react-native';

import { useRouter } from 'expo-router';

import { ExperienceCategory, LABEL_EXPERIENCE_CATEGORY, Plan, PlanStatus } from '@/core';
import { CatalogView } from '@/features/catalog/views/CatalogView';

import { CatalogoFalso } from '../../../support/catalogo-falso';
import { dependenciasDePrueba } from '../../../support/dependencias-de-prueba';
import { reiniciarRouterFalso } from '../../../support/expo-router-falso';
import { fijarVentana, renderPantalla, restaurarVentana } from '../../../support/pantalla';

// useRouter espiado: cada PlanCard lo llama al pintarse, así se cuenta cuántas se vuelven a pintar.
jest.mock('expo-router', () => {
  const fake = jest.requireActual('../../../support/expo-router-falso');
  return { ...fake, useRouter: jest.fn(fake.useRouter) };
});

/**
 * Buscador del catálogo: lo que el viajero escribe llega a `CatalogRepository.search` en
 * `CatalogFilters.text`, y solo al enviar o al borrar (gotcha 12). Sin red: el catálogo es un
 * doble que registra los filtros. Port 1:1 de `buscador_test.dart`.
 */

async function renderCatalog() {
  await fijarVentana(600, 1000);
  const catalog = new CatalogoFalso();
  await renderPantalla(<CatalogView />, { dependencias: dependenciasDePrueba({ catalogo: catalog }) });
  return catalog;
}

const searchField = () => screen.getByLabelText('Buscar planes');

async function typeAndSearch(text: string) {
  await fireEvent.changeText(searchField(), text);
  await fireEvent(searchField(), 'submitEditing');
}

beforeEach(reiniciarRouterFalso);
afterEach(restaurarVentana);

test('al abrir se carga el catálogo sin texto', async () => {
  const catalog = await renderCatalog();

  expect(catalog.busquedas).toHaveLength(1);
  expect(catalog.busquedas[0]!.text).toBe('');
});

test('escribir y enviar busca con el texto escrito', async () => {
  const catalog = await renderCatalog();

  await typeAndSearch('guatape');

  expect(catalog.busquedas).toHaveLength(2);
  expect(catalog.busquedas.at(-1)!.text).toBe('guatape');
});

test('el texto se envía tal cual, con tildes y comas', async () => {
  const catalog = await renderCatalog();

  await typeAndSearch('Café, (Jardín)');

  expect(catalog.busquedas.at(-1)!.text).toBe('Café, (Jardín)');
});

test('escribir sin enviar no dispara otra búsqueda', async () => {
  const catalog = await renderCatalog();

  await fireEvent.changeText(searchField(), 'guatape');

  expect(catalog.busquedas).toHaveLength(1);
});

test('el botón de borrar aparece al escribir y busca sin texto', async () => {
  const catalog = await renderCatalog();
  expect(screen.queryByRole('button', { name: 'Borrar búsqueda' })).toBeNull();

  await typeAndSearch('guatape');
  expect(screen.getByRole('button', { name: 'Borrar búsqueda' })).toBeOnTheScreen();

  await fireEvent.press(screen.getByRole('button', { name: 'Borrar búsqueda' }));

  expect(catalog.busquedas.at(-1)!.text).toBe('');
  expect(searchField().props.value).toBe('');
  expect(screen.queryByRole('button', { name: 'Borrar búsqueda' })).toBeNull();
});

test('otro filtro conserva el texto buscado', async () => {
  const catalog = await renderCatalog();
  await typeAndSearch('guatape');

  await fireEvent.press(screen.getByText(LABEL_EXPERIENCE_CATEGORY[ExperienceCategory.adventure]));

  expect(catalog.busquedas.at(-1)!.text).toBe('guatape');
  expect(catalog.busquedas.at(-1)!.category).toBe(ExperienceCategory.adventure);
});

test('escribir no vuelve a pintar las tarjetas de la lista (trabajo por tecla acotado)', async () => {
  // En un emulador lento, re-pintar todo el catálogo por tecla desincronizaba el campo controlado
  // («cafe» quedaba «ccafe»). La pantalla no pasa por React Compiler (try/finally lo hace desistir).
  const plan = (i: number) =>
    new Plan({ id: `p${i}`, agencyId: 'ag', title: `Plan ${i}`, destination: 'Guatapé', category: ExperienceCategory.culture, priceCop: 100000, status: PlanStatus.published, photos: [], averageRating: 4, reviewsCount: 1 });
  await fijarVentana(600, 1000);
  const catalog = new CatalogoFalso({ planes: [1, 2, 3, 4, 5].map(plan) });
  await renderPantalla(<CatalogView />, { dependencias: dependenciasDePrueba({ catalogo: catalog }) });
  expect(screen.getAllByTestId(/^plan-card-/)).toHaveLength(5);
  const routerCalls = jest.mocked(useRouter);
  routerCalls.mockClear();

  for (const text of ['c', 'ca', 'caf', 'cafe']) await fireEvent.changeText(searchField(), text);

  expect(searchField().props.value).toBe('cafe');
  // Solo la vista (1 llamada por tecla); antes, además, las 5 tarjetas en cada tecla.
  expect(routerCalls.mock.calls.length).toBeLessThanOrEqual(4);
});
