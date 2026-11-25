import { screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { AgencySummary } from '@/core/models/agency-summary';
import { ExperienceCategory, PlanStatus } from '@/core/models/enums';
import { Plan } from '@/core/models/plan';
import { AgencyAvatar, PriceText, PlanScore } from '@/ui/components';
import { lightTheme, darkTheme } from '@/ui/theme';

import { icons, renderWithTheme } from '../support/render-with-theme';

const styleOf = (el: { props: { style?: unknown } }) =>
  StyleSheet.flatten(el.props.style as never) as Record<string, unknown>;

const plan = ({ reviews = 0, rating = 0 } = {}) =>
  new Plan({
    id: 'plan-1',
    agencyId: 'ag',
    title: 'Jericó 2 días',
    destination: 'Jericó',
    category: ExperienceCategory.culture,
    priceCop: 449000,
    status: PlanStatus.published,
    averageRating: rating,
    reviewsCount: reviews,
  });

// Port de modo_oscuro_test.dart.
describe('PriceText', () => {
  it('modo oscuro: la unidad del precio usa el color secundario del tema', async () => {
    await renderWithTheme(<PriceText amount={178000} />, { mode: 'dark' });
    expect(styleOf(screen.getByText('por persona · precio final')).color).toBe(
      darkTheme.colorScheme.onSurfaceVariant,
    );
  });

  it('monto con formatCOP, 21 w800 ls -0.5 onSurface; unidad 10.5', async () => {
    await renderWithTheme(<PriceText amount={190000} />);
    const amount = styleOf(screen.getByText('$ 190.000'));
    expect([amount.fontSize, amount.fontWeight, amount.letterSpacing, amount.color]).toEqual([
      21,
      '800',
      -0.5,
      lightTheme.colorScheme.onSurface,
    ]);
    expect(styleOf(screen.getByText('por persona · precio final')).fontSize).toBe(10.5);
  });

  it('alineado al final', async () => {
    await renderWithTheme(<PriceText amount={1} align="end" />);
    expect(styleOf(screen.getByTestId('price-text')).alignItems).toBe('flex-end');
  });
});

// Port de la parte de widget de puntaje_nueva_test.dart (la tarjeta y la ficha son de T5).
describe('PlanScore', () => {
  it('Plan.esNuevo: sin reseñas aunque el promedio venga en 0', () => {
    expect(plan().isNew).toBe(true);
    expect(plan({ reviews: 1, rating: 5 }).isNew).toBe(false);
  });

  it('sin reseñas dice «Nueva», sin estrella ni 0.0', async () => {
    await renderWithTheme(<PlanScore plan={plan()} />);
    expect(screen.getByText('Nueva')).toBeOnTheScreen();
    expect(screen.queryByText('0.0')).toBeNull();
    expect(icons('star_rounded')).toHaveLength(0);
  });

  it('PRESERVE: con reseñas muestra ★ 4.5 y la cantidad', async () => {
    await renderWithTheme(<PlanScore plan={plan({ reviews: 3, rating: 4.5 })} />);
    expect(screen.getByText('4.5')).toBeOnTheScreen();
    expect(screen.getByText('(3)')).toBeOnTheScreen();
    expect(icons('star_rounded')).toHaveLength(1);
    expect(screen.queryByText('Nueva')).toBeNull();
    expect(styleOf(screen.getByText('(3)')).fontSize).toBe(12);
  });

  it('detallado: «· n reseñas verificadas» en 13 y sin hablar de reseñas cuando es nueva', async () => {
    await renderWithTheme(<PlanScore plan={plan({ reviews: 2, rating: 4 })} detailed />);
    expect(screen.getByText('4.0')).toBeOnTheScreen();
    const text = screen.getByText(' · 2 reseñas verificadas');
    expect(styleOf(text).fontSize).toBe(13);
    expect(styleOf(text).color).toBe(lightTheme.colorScheme.onSurfaceVariant);
  });

  it('detallado y nueva: «Nueva», nada de reseñas verificadas', async () => {
    await renderWithTheme(<PlanScore plan={plan()} detailed />);
    expect(screen.getByText('Nueva')).toBeOnTheScreen();
    expect(screen.queryByText(/reseñas verificadas/)).toBeNull();
  });
});

describe('AgencyAvatar con el modelo de core', () => {
  it('acepta AgencySummary (iniciales del modelo)', async () => {
    const agency = new AgencySummary({
      id: 'ag-rutas',
      name: 'Rutas de Antioquia Cultural',
      city: 'Medellín',
      planCount: 6,
      rating: 4.5,
      reviewsTotal: 2,
    });
    await renderWithTheme(<AgencyAvatar agency={agency} />);
    expect(screen.getByText(agency.initials)).toBeOnTheScreen();
  });
});
