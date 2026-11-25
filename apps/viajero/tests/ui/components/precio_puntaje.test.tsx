import { screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { AgencySummary } from '@/core/models/agency-summary';
import { ExperienceCategory, PlanStatus } from '@/core/models/enums';
import { Plan } from '@/core/models/plan';
import { AgencyAvatar, PriceText, PuntajePlan } from '@/ui/components';
import { lightTheme, darkTheme } from '@/ui/theme';

import { icons, renderWithTheme } from '../support/render-with-theme';

const estilo = (el: { props: { style?: unknown } }) =>
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
    await renderWithTheme(<PriceText monto={178000} />, { mode: 'dark' });
    expect(estilo(screen.getByText('por persona · precio final')).color).toBe(
      darkTheme.colorScheme.onSurfaceVariant,
    );
  });

  it('monto con formatCOP, 21 w800 ls -0.5 onSurface; unidad 10.5', async () => {
    await renderWithTheme(<PriceText monto={190000} />);
    const monto = estilo(screen.getByText('$ 190.000'));
    expect([monto.fontSize, monto.fontWeight, monto.letterSpacing, monto.color]).toEqual([
      21,
      '800',
      -0.5,
      lightTheme.colorScheme.onSurface,
    ]);
    expect(estilo(screen.getByText('por persona · precio final')).fontSize).toBe(10.5);
  });

  it('alineado al final', async () => {
    await renderWithTheme(<PriceText monto={1} alineado="end" />);
    expect(estilo(screen.getByTestId('price-text')).alignItems).toBe('flex-end');
  });
});

// Port de la parte de widget de puntaje_nueva_test.dart (la tarjeta y la ficha son de T5).
describe('PuntajePlan', () => {
  it('Plan.esNuevo: sin reseñas aunque el promedio venga en 0', () => {
    expect(plan().isNew).toBe(true);
    expect(plan({ reviews: 1, rating: 5 }).isNew).toBe(false);
  });

  it('sin reseñas dice «Nueva», sin estrella ni 0.0', async () => {
    await renderWithTheme(<PuntajePlan plan={plan()} />);
    expect(screen.getByText('Nueva')).toBeOnTheScreen();
    expect(screen.queryByText('0.0')).toBeNull();
    expect(icons('star_rounded')).toHaveLength(0);
  });

  it('PRESERVE: con reseñas muestra ★ 4.5 y la cantidad', async () => {
    await renderWithTheme(<PuntajePlan plan={plan({ reviews: 3, rating: 4.5 })} />);
    expect(screen.getByText('4.5')).toBeOnTheScreen();
    expect(screen.getByText('(3)')).toBeOnTheScreen();
    expect(icons('star_rounded')).toHaveLength(1);
    expect(screen.queryByText('Nueva')).toBeNull();
    expect(estilo(screen.getByText('(3)')).fontSize).toBe(12);
  });

  it('detallado: «· n reseñas verificadas» en 13 y sin hablar de reseñas cuando es nueva', async () => {
    await renderWithTheme(<PuntajePlan plan={plan({ reviews: 2, rating: 4 })} detallado />);
    expect(screen.getByText('4.0')).toBeOnTheScreen();
    const texto = screen.getByText(' · 2 reseñas verificadas');
    expect(estilo(texto).fontSize).toBe(13);
    expect(estilo(texto).color).toBe(lightTheme.colorScheme.onSurfaceVariant);
  });

  it('detallado y nueva: «Nueva», nada de reseñas verificadas', async () => {
    await renderWithTheme(<PuntajePlan plan={plan()} detallado />);
    expect(screen.getByText('Nueva')).toBeOnTheScreen();
    expect(screen.queryByText(/reseñas verificadas/)).toBeNull();
  });
});

describe('AgencyAvatar con el modelo de core', () => {
  it('acepta AgenciaResumen (iniciales del modelo)', async () => {
    const agencia = new AgencySummary({
      id: 'ag-rutas',
      name: 'Rutas de Antioquia Cultural',
      city: 'Medellín',
      planCount: 6,
      rating: 4.5,
      reviewsTotal: 2,
    });
    await renderWithTheme(<AgencyAvatar agencia={agencia} />);
    expect(screen.getByText(agencia.initials)).toBeOnTheScreen();
  });
});
