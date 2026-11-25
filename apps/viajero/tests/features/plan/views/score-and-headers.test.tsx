import { act, fireEvent, screen, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { AgencySummary, ExperienceCategory, Plan, PlanStatus } from '@/core';
import { AgenciaView } from '@/features/agencies/views/AgenciaView';
import { AgenciasView } from '@/features/agencies/views/AgenciasView';
import { PlanCard } from '@/features/catalog/components/PlanCard';
import { CatalogView } from '@/features/catalog/views/CatalogView';
import { PlanDetailView } from '@/features/plan/views/PlanDetailView';
import { darkTheme } from '@/ui/theme';

import { CatalogoFalso, ResenasFalsas } from '../../../support/catalogo-falso';
import { dependenciasDePrueba } from '../../../support/dependencias-de-prueba';
import { reiniciarRouterFalso } from '../../../support/expo-router-falso';
import { fijarVentana, renderPantalla, restaurarVentana } from '../../../support/pantalla';

jest.mock('expo-router', () => require('../../../support/expo-router-falso'));

/**
 * Lo que de `puntaje_nueva_test.dart` y `cabeceras_test.dart` toca las pantallas de T5: la
 * tarjeta y la ficha dicen «Nueva» sin 0.0; Explorar y Agencias llevan el título en la barra (no
 * en el scroll); la ficha y la agencia usan la cabecera colapsable (sin título con la foto a la
 * vista, sólida con título y «Volver» al colapsar).
 */

const plan = ({ reviews = 0, rating = 0 }: { reviews?: number; rating?: number } = {}) =>
  new Plan({
    id: 'plan-1',
    agencyId: 'ag-rutas',
    title: 'Plan número 1',
    destination: 'Guatapé',
    category: ExperienceCategory.adventure,
    priceCop: 150000,
    status: PlanStatus.published,
    reviewsCount: reviews,
    averageRating: rating,
  });

const agency = new AgencySummary({ id: 'ag-rutas', name: 'Rutas de Antioquia Cultural', city: 'Medellín', planCount: 1 });

function testDependencies(p = plan()) {
  const catalog = new CatalogoFalso({
    planes: [p],
    detalles: { 'plan-1': p },
    agenciasPublicas: [agency],
    planesPorAgencia: { 'ag-rutas': [p] },
  });
  return dependenciasDePrueba({ catalogo: catalog, resenas: new ResenasFalsas() as never });
}

async function scrollTo(y: number) {
  await act(async () => {
    fireEvent.scroll(screen.getByTestId('cabecera-scroll'), {
      nativeEvent: {
        contentOffset: { x: 0, y },
        contentSize: { width: 600, height: 3000 },
        layoutMeasurement: { width: 600, height: 1000 },
      },
    });
  });
}

beforeEach(async () => {
  reiniciarRouterFalso();
  await fijarVentana(600, 1000);
});
afterEach(restaurarVentana);

describe('tarjeta del catálogo', () => {
  test('sin reseñas dice «Nueva», sin estrella ni 0.0', async () => {
    await renderPantalla(<PlanCard plan={plan()} />);
    expect(screen.getByText('Nueva')).toBeOnTheScreen();
    expect(screen.queryByText('0.0')).toBeNull();
    expect(screen.queryAllByTestId('icono-star_rounded', { includeHiddenElements: true })).toHaveLength(0);
  });

  test('PRESERVE: con reseñas sigue mostrando ★ 4.5 y la cantidad', async () => {
    await renderPantalla(<PlanCard plan={plan({ reviews: 3, rating: 4.5 })} />);
    expect(screen.getByText('4.5')).toBeOnTheScreen();
    expect(screen.getByText('(3)')).toBeOnTheScreen();
    expect(screen.queryAllByTestId('icono-star_rounded', { includeHiddenElements: true })).toHaveLength(1);
    expect(screen.queryByText('Nueva')).toBeNull();
  });
});

describe('ficha del plan', () => {
  test('sin reseñas dice «Nueva» y no habla de reseñas verificadas', async () => {
    await renderPantalla(<PlanDetailView planId="plan-1" />, { dependencias: testDependencies() });
    expect(screen.getByText('Nueva')).toBeOnTheScreen();
    expect(screen.queryByText('0.0')).toBeNull();
    expect(screen.queryByText(/reseñas verificadas/)).toBeNull();
  });

  test('PRESERVE: con reseñas muestra el puntaje y «n reseñas verificadas»', async () => {
    await renderPantalla(<PlanDetailView planId="plan-1" />, { dependencias: testDependencies(plan({ reviews: 2, rating: 4.0 })) });
    expect(screen.getByText('4.0')).toBeOnTheScreen();
    expect(screen.getByText(/2 reseñas verificadas/)).toBeOnTheScreen();
    expect(screen.queryByText('Nueva')).toBeNull();
  });
});

describe('páginas con el título en la barra superior', () => {
  const pages: [string, () => React.JSX.Element, string, string][] = [
    ['Explorar', () => <CatalogView />, 'Descubre Antioquia', 'catalogo-scroll'],
    ['Agencias', () => <AgenciasView />, 'Agencias', 'agencias-scroll'],
  ];
  for (const [name, view, title, scroll] of pages) {
    test(`${name}: el título no está dentro del scroll y usa el título de página grande`, async () => {
      await renderPantalla(view(), { dependencias: testDependencies() });

      const bar = within(screen.getByTestId('barra-superior'));
      const text = bar.getByText(title);
      expect(within(screen.getByTestId(scroll)).queryByText(title)).toBeNull();
      const s = StyleSheet.flatten(text.props.style);
      expect(s.fontSize).toBeGreaterThanOrEqual(24);
      expect(s.fontWeight).toBe('800');
    });
  }

  test('en tema oscuro el título y la cabecera también se leen', async () => {
    await renderPantalla(<AgenciasView />, { dependencias: testDependencies(), modo: 'dark' });

    const bar = screen.getByTestId('barra-superior');
    expect(StyleSheet.flatten(within(bar).getByText('Agencias').props.style).color).toBe(darkTheme.colorScheme.onSurface);
    expect(StyleSheet.flatten(bar.props.style).backgroundColor).toBe(darkTheme.pageBackground);
  });
});

describe('cabecera colapsable', () => {
  test('detalle del plan: sin título en la cabecera con la foto a la vista; al colapsar, sólida con título y «Volver»', async () => {
    await renderPantalla(<PlanDetailView planId="plan-1" />, { dependencias: testDependencies() });

    expect(screen.queryByTestId('cabecera-titulo')).toBeNull();
    expect(within(screen.getByTestId('cabecera-scroll')).getByText('Plan número 1')).toBeOnTheScreen();

    await scrollTo(2500);

    expect(screen.getByTestId('cabecera-titulo')).toHaveTextContent('Plan número 1');
    expect(screen.getByRole('button', { name: 'Volver' })).toBeOnTheScreen();
  });

  test('página de la agencia: sin nombre en la cabecera con la portada; al colapsar, sólida con nombre y «Volver»', async () => {
    await renderPantalla(<AgenciaView agencyId="ag-rutas" />, { dependencias: testDependencies() });

    expect(screen.queryByTestId('cabecera-titulo')).toBeNull();
    expect(screen.getByText(agency.name)).toBeOnTheScreen();

    await scrollTo(2500);

    expect(screen.getByTestId('cabecera-titulo')).toHaveTextContent(agency.name);
    expect(screen.getByRole('button', { name: 'Volver' })).toBeOnTheScreen();
    // El nombre de la cabecera va entre el botón de volver (64) y el borde derecho (20).
    expect(screen.getByTestId('cabecera-titulo-caja')).toHaveStyle({ left: 64, right: 20 });
  });
});
