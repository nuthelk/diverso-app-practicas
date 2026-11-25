import { type Href, router } from 'expo-router';
import { act, fireEvent, screen } from 'expo-router/testing-library';

import { AgencySummary, ExperienceCategory, Plan, PlanStatus } from '@/core';
import { dejarPlanesParaComparar, olvidarPlanesParaComparar } from '@/features/catalog/planes-para-comparar';
import { AppRoutes } from '@/router';

import { arrancarApp, asentar, pantallaVisible } from '../support/app';
import { CatalogoFalso, ResenasFalsas } from '../support/catalogo-falso';
import { dependenciasDePrueba } from '../support/dependencias-de-prueba';

/**
 * Las pantallas del catálogo abiertas por URL (recarga en web o deep link, gotcha 5): cada id de
 * la ruta llega a su repositorio. Incluye el grupo `/comparar?ids=…` de
 * `router/rutas_con_ids_test.dart`.
 */

const plan = (id: string) =>
  new Plan({
    id,
    agencyId: 'a1',
    title: `Plan ${id}`,
    destination: 'Guatapé',
    category: ExperienceCategory.adventure,
    priceCop: 150000,
    status: PlanStatus.published,
  });

function catalogoDePrueba() {
  return new CatalogoFalso({
    detalles: Object.fromEntries(['p1', 'p2', 'p3', 'p4'].map((id) => [id, plan(id)])),
    agenciasPublicas: [new AgencySummary({ id: 'a1', name: 'Rutas de Antioquia', city: 'Medellín' })],
  });
}

async function abrir(url: string, catalogo = catalogoDePrueba()) {
  const r = await arrancarApp(url, dependenciasDePrueba({ catalogo, resenas: new ResenasFalsas() as never }));
  return { r, catalogo };
}

beforeEach(() => {
  olvidarPlanesParaComparar();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('cada id de la URL llega a su repositorio', () => {
  test('/agencia/:id pide esa agencia', async () => {
    const { catalogo } = await abrir(AppRoutes.agencia('a1'));
    expect(pantallaVisible('AgenciaView')).toBeOnTheScreen();
    expect(catalogo.agenciasPedidas).toEqual(['a1']);
  });

  test('/plan/:id pide ese plan', async () => {
    const { catalogo } = await abrir(AppRoutes.plan('p1'));
    expect(pantallaVisible('PlanDetailView')).toBeOnTheScreen();
    expect(catalogo.detallesPedidos).toEqual(['p1']);
  });
});

describe('/comparar?ids=…', () => {
  test('tras una recarga (solo la URL, sin extra) muestra los planes', async () => {
    const { catalogo } = await abrir('/comparar?ids=p1,p2');

    expect(catalogo.detallesPedidos).toEqual(['p1', 'p2']);
    expect(screen.getByText('Elige con toda la información')).toBeOnTheScreen();
    expect(screen.getByText('Plan p1')).toBeOnTheScreen();
    expect(screen.getByText('Plan p2')).toBeOnTheScreen();
    expect(screen.queryByText('Nada para comparar')).toBeNull();
  });

  test('respeta el orden de los ids, ignora repetidos y compara como mucho tres', async () => {
    const { catalogo } = await abrir('/comparar?ids=p2,p1,p2,p3,p4');
    expect(catalogo.detallesPedidos).toEqual(['p2', 'p1', 'p3']);
  });

  test('sin ids no hay nada que comparar (y no consulta nada)', async () => {
    const { catalogo } = await abrir('/comparar');
    expect(screen.getByText('Nada para comparar')).toBeOnTheScreen();
    expect(catalogo.detallesPedidos).toEqual([]);
  });

  test('si la carga falla avisa y «Reintentar» vuelve a cargar', async () => {
    const catalogo = catalogoDePrueba();
    catalogo.fallo = new Error('sin red');
    await abrir('/comparar?ids=p1,p2', catalogo);
    expect(screen.getByText('No pudimos cargar la comparación')).toBeOnTheScreen();
    expect(screen.queryByText('Elige con toda la información')).toBeNull();

    catalogo.fallo = null;
    await fireEvent.press(screen.getByText('Reintentar'));
    await asentar();

    expect(screen.getByText('Plan p1')).toBeOnTheScreen();
    expect(screen.getByText('Plan p2')).toBeOnTheScreen();
  });

  test('desde el catálogo, el `extra` evita volver a pedir los planes', async () => {
    const { r, catalogo } = await abrir(AppRoutes.legal('privacidad'));

    dejarPlanesParaComparar([plan('p1'), plan('p2')]);
    await act(async () => router.push(AppRoutes.compararPlanes(['p1', 'p2']) as Href));
    await asentar();

    expect(screen.getByText('Elige con toda la información')).toBeOnTheScreen();
    expect(catalogo.detallesPedidos).toEqual([]);
    expect(r.getPathname()).toBe('/comparar');
  });
});
