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
  const falso = jest.requireActual('../../../support/expo-router-falso');
  return { ...falso, useRouter: jest.fn(falso.useRouter) };
});

/**
 * Buscador del catálogo: lo que el viajero escribe llega a `CatalogRepository.search` en
 * `FiltrosCatalogo.texto`, y solo al enviar o al borrar (gotcha 12). Sin red: el catálogo es un
 * doble que registra los filtros. Port 1:1 de `buscador_test.dart`.
 */

async function abrir() {
  await fijarVentana(600, 1000);
  const catalogo = new CatalogoFalso();
  await renderPantalla(<CatalogView />, { dependencias: dependenciasDePrueba({ catalogo }) });
  return catalogo;
}

const buscador = () => screen.getByLabelText('Buscar planes');

async function escribirYBuscar(texto: string) {
  await fireEvent.changeText(buscador(), texto);
  await fireEvent(buscador(), 'submitEditing');
}

beforeEach(reiniciarRouterFalso);
afterEach(restaurarVentana);

test('al abrir se carga el catálogo sin texto', async () => {
  const catalogo = await abrir();

  expect(catalogo.busquedas).toHaveLength(1);
  expect(catalogo.busquedas[0]!.texto).toBe('');
});

test('escribir y enviar busca con el texto escrito', async () => {
  const catalogo = await abrir();

  await escribirYBuscar('guatape');

  expect(catalogo.busquedas).toHaveLength(2);
  expect(catalogo.busquedas.at(-1)!.texto).toBe('guatape');
});

test('el texto se envía tal cual, con tildes y comas', async () => {
  const catalogo = await abrir();

  await escribirYBuscar('Café, (Jardín)');

  expect(catalogo.busquedas.at(-1)!.texto).toBe('Café, (Jardín)');
});

test('escribir sin enviar no dispara otra búsqueda', async () => {
  const catalogo = await abrir();

  await fireEvent.changeText(buscador(), 'guatape');

  expect(catalogo.busquedas).toHaveLength(1);
});

test('el botón de borrar aparece al escribir y busca sin texto', async () => {
  const catalogo = await abrir();
  expect(screen.queryByRole('button', { name: 'Borrar búsqueda' })).toBeNull();

  await escribirYBuscar('guatape');
  expect(screen.getByRole('button', { name: 'Borrar búsqueda' })).toBeOnTheScreen();

  await fireEvent.press(screen.getByRole('button', { name: 'Borrar búsqueda' }));

  expect(catalogo.busquedas.at(-1)!.texto).toBe('');
  expect(buscador().props.value).toBe('');
  expect(screen.queryByRole('button', { name: 'Borrar búsqueda' })).toBeNull();
});

test('otro filtro conserva el texto buscado', async () => {
  const catalogo = await abrir();
  await escribirYBuscar('guatape');

  await fireEvent.press(screen.getByText(LABEL_EXPERIENCE_CATEGORY[ExperienceCategory.aventura]));

  expect(catalogo.busquedas.at(-1)!.texto).toBe('guatape');
  expect(catalogo.busquedas.at(-1)!.categoria).toBe(ExperienceCategory.aventura);
});

test('escribir no vuelve a pintar las tarjetas de la lista (trabajo por tecla acotado)', async () => {
  // En un emulador lento, re-pintar todo el catálogo por tecla desincronizaba el campo controlado
  // («cafe» quedaba «ccafe»). La pantalla no pasa por React Compiler (try/finally lo hace desistir).
  const plan = (i: number) =>
    new Plan({ id: `p${i}`, agencyId: 'ag', titulo: `Plan ${i}`, destino: 'Guatapé', categoria: ExperienceCategory.cultura, precioCop: 100000, estado: PlanStatus.publicado, fotos: [], ratingPromedio: 4, reviewsCount: 1 });
  await fijarVentana(600, 1000);
  const catalogo = new CatalogoFalso({ planes: [1, 2, 3, 4, 5].map(plan) });
  await renderPantalla(<CatalogView />, { dependencias: dependenciasDePrueba({ catalogo }) });
  expect(screen.getAllByTestId(/^plan-card-/)).toHaveLength(5);
  const pintadas = jest.mocked(useRouter);
  pintadas.mockClear();

  for (const texto of ['c', 'ca', 'caf', 'cafe']) await fireEvent.changeText(buscador(), texto);

  expect(buscador().props.value).toBe('cafe');
  // Solo la vista (1 llamada por tecla); antes, además, las 5 tarjetas en cada tecla.
  expect(pintadas.mock.calls.length).toBeLessThanOrEqual(4);
});
