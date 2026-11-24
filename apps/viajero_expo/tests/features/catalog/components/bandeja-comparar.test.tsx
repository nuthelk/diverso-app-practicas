import { act, fireEvent, screen, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { ExperienceCategory, formatCOP, Plan, PlanStatus } from '@/core';
import { olvidarPlanesParaComparar, planesParaComparar } from '@/features/catalog/planes-para-comparar';
import { CatalogView } from '@/features/catalog/views/CatalogView';

import { CatalogoFalso } from '../../../support/catalogo-falso';
import { dependenciasDePrueba } from '../../../support/dependencias-de-prueba';
import { reiniciarRouterFalso, routerFalso } from '../../../support/expo-router-falso';
import { fijarVentana, renderPantalla, restaurarVentana } from '../../../support/pantalla';

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
    titulo: `Plan ${i}`,
    destino: 'Guatapé',
    categoria: ExperienceCategory.cultura,
    precioCop: 100000 + i,
    estado: PlanStatus.publicado,
    fotos: ['https://fotos.test/p.jpg'],
    ratingPromedio: 4.0,
    reviewsCount: 3,
  });

async function abrir({ planes = 4 }: { planes?: number } = {}) {
  // 600 de ancho: lista de una columna y espacio para tres miniaturas junto al botón.
  await fijarVentana(600, 1000);
  const catalogo = new CatalogoFalso({ planes: Array.from({ length: planes }, (_, i) => plan(i + 1)) });
  await renderPantalla(<CatalogView />, { dependencias: dependenciasDePrueba({ catalogo }) });
}

/** Deja correr la animación de la bandeja (220 ms). */
async function animar() {
  await act(async () => {
    jest.advanceTimersByTime(400);
  });
}

async function agregar() {
  await fireEvent.press(screen.getAllByRole('button', { name: 'Agregar al comparador' })[0]!);
  await animar();
}

const bandeja = () => screen.queryByTestId('bandeja-comparar');
const enBandeja = () => within(screen.getByTestId('bandeja-comparar'));
const botonComparar = () => enBandeja().getByTestId('boton-comparar');

beforeEach(() => {
  jest.useFakeTimers();
  reiniciarRouterFalso();
  olvidarPlanesParaComparar();
});
afterEach(async () => {
  await restaurarVentana();
  jest.useRealTimers();
});

test('sin planes elegidos no hay bandeja', async () => {
  await abrir();

  expect(bandeja()).toBeNull();
  expect(screen.queryByText('Limpiar')).toBeNull();
});

test('con 1 plan: contador, pista y «Comparar (1)» deshabilitado', async () => {
  await abrir();
  await agregar();

  expect(bandeja()).toBeOnTheScreen();
  expect(enBandeja().getByText('1 de 3 planes')).toBeOnTheScreen();
  expect(enBandeja().getByText('Elige al menos 2 planes')).toBeOnTheScreen();
  expect(enBandeja().getByText('Plan 1')).toBeOnTheScreen(); // miniatura con su título
  expect(enBandeja().getByText('Limpiar')).toBeOnTheScreen();
  expect(botonComparar()).toBeDisabled();
  expect(enBandeja().getByText('Comparar (1)')).toBeOnTheScreen();

  // Tocar el botón deshabilitado no navega.
  await fireEvent.press(botonComparar());
  expect(routerFalso.push).not.toHaveBeenCalled();
});

test('con 2 planes: «Comparar (2)» activo, sin pista, y abre el comparador con ellos', async () => {
  await abrir();
  await agregar();
  await agregar();

  expect(enBandeja().getByText('2 de 3 planes')).toBeOnTheScreen();
  expect(enBandeja().queryByText('Elige al menos 2 planes')).toBeNull();
  expect(enBandeja().getByText('Comparar (2)')).toBeOnTheScreen();
  expect(botonComparar()).toBeEnabled();

  await fireEvent.press(botonComparar());
  expect(routerFalso.push).toHaveBeenCalledWith('/comparar?ids=plan-1,plan-2');
  // El `extra`: los planes que ya se tenían viajan en memoria.
  expect(planesParaComparar()!.map((p) => p.id)).toEqual(['plan-1', 'plan-2']);
});

test('la ✕ de una miniatura quita ese plan y vuelve la pista', async () => {
  await abrir();
  await agregar();
  await agregar();

  await fireEvent.press(screen.getByRole('button', { name: 'Quitar Plan 1 de la comparación' }));
  await animar();

  expect(enBandeja().getByText('1 de 3 planes')).toBeOnTheScreen();
  expect(enBandeja().queryByText('Plan 1')).toBeNull();
  expect(enBandeja().getByText('Plan 2')).toBeOnTheScreen();
  expect(enBandeja().getByText('Elige al menos 2 planes')).toBeOnTheScreen();
  expect(botonComparar()).toBeDisabled();
  // La tarjeta del plan quitado vuelve a poder agregarse.
  expect(screen.getAllByRole('button', { name: 'Agregar al comparador' }).length).toBeGreaterThan(0);
});

test('«Limpiar» vacía la selección y la bandeja desaparece', async () => {
  await abrir();
  await agregar();
  await agregar();

  await fireEvent.press(enBandeja().getByText('Limpiar'));
  await animar();

  expect(bandeja()).toBeNull();
  expect(screen.queryByRole('button', { name: 'Quitar del comparador' })).toBeNull();
});

test('respeta el máximo de 3: el cuarto plan no entra', async () => {
  await abrir();
  for (let i = 0; i < 3; i++) await agregar();
  expect(enBandeja().getByText('3 de 3 planes')).toBeOnTheScreen();
  expect(enBandeja().getByText('Máximo 3 planes')).toBeOnTheScreen();

  await agregar(); // intento del cuarto

  expect(enBandeja().getByText('3 de 3 planes')).toBeOnTheScreen();
  expect(enBandeja().queryByText('Plan 4')).toBeNull();
  expect(enBandeja().getByText('Comparar (3)')).toBeOnTheScreen();
});

test('la bandeja queda debajo de la lista (no superpuesta): no tapa el final', async () => {
  await abrir({ planes: 6 });
  await agregar();

  const scroll = screen.getByTestId('catalogo-scroll');
  // El último precio está en la lista; la bandeja, fuera del scroll y sin posición absoluta.
  expect(within(scroll).getByText(formatCOP(100006))).toBeOnTheScreen();
  expect(within(scroll).queryByTestId('bandeja-comparar')).toBeNull();
  const pantalla = screen.getByTestId('pantalla-CatalogView');
  const hijos = pantalla.children as { props: { testID?: string } }[];
  const indice = (pred: (h: { props: { testID?: string } }) => boolean) => hijos.findIndex(pred);
  expect(indice((h) => h.props.testID === 'catalogo-scroll')).toBeLessThan(hijos.length - 1);
  expect(StyleSheet.flatten(screen.getByTestId('bandeja-comparar').props.style).position).toBeUndefined();
});

test('los lugares libres miden lo mismo que una miniatura, con su «+» decorativo', async () => {
  await abrir();
  await agregar();

  const alto = (el: { props: Record<string, unknown> }) => StyleSheet.flatten(el.props.style as never).height;
  const foto = enBandeja().getByTestId('foto-miniatura');
  const huecos = enBandeja().getAllByTestId('hueco-bandeja', { includeHiddenElements: true });
  expect(huecos).toHaveLength(2); // 3 lugares, 1 ocupado
  for (const h of huecos) expect(alto(h)).toBe(alto(foto));
  expect(alto(foto)).toBeGreaterThan(40); // no son cápsulas angostas
  expect(within(huecos[0]!).getByTestId('icono-add_rounded', { includeHiddenElements: true })).toBeTruthy();
  // Decorativo: sin semántica ni foco.
  const hueco = enBandeja().getAllByTestId('hueco', { includeHiddenElements: true })[0]!;
  expect(hueco.props.importantForAccessibility).toBe('no-hide-descendants');
  expect(hueco.props.accessibilityElementsHidden).toBe(true);
  expect(within(hueco).queryAllByRole('button', { includeHiddenElements: true })).toHaveLength(0);
});

test('accesible: cada ✕ y cada botón tienen etiqueta', async () => {
  await abrir();
  await agregar();

  const quitar = screen.getByRole('button', { name: 'Quitar Plan 1 de la comparación' });
  expect(quitar).toBeOnTheScreen();
  expect(enBandeja().getByRole('button', { name: 'Limpiar' })).toBeOnTheScreen();
  expect(enBandeja().getByRole('button', { name: 'Comparar (1)' })).toBeOnTheScreen();
});
