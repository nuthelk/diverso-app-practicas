import { buildComparisonRows } from '@/core/comparison/comparison-row';
import { ExperienceCategory, PlanStatus } from '@/core/models/enums';
import { Plan, PlanDate } from '@/core/models/plan';
import { localDate, dateToIso } from '@/core/utils/dates';
import { todayInBogota } from '@/core/utils/bogota-time';

const plan = ({
  reviews = 0,
  rating = 0,
  price = 100000,
  ...rest
}: { reviews?: number; rating?: number; price?: number } & Partial<ConstructorParameters<typeof Plan>[0]> = {}) =>
  new Plan({
    id: 'p',
    agencyId: 'a',
    title: 'Plan',
    destination: 'Jericó',
    category: ExperienceCategory.culture,
    priceCop: price,
    status: PlanStatus.published,
    averageRating: rating,
    reviewsCount: reviews,
    ...rest,
  });

test('Plan.esNuevo: sin reseñas aunque el promedio venga en 0', () => {
  expect(plan().isNew).toBe(true);
  expect(plan({ reviews: 2, rating: 4.5 }).isNew).toBe(false);
});

test('el comparador dice «Nueva» para un plan sin reseñas y conserva el formato con reseñas', () => {
  const rows = buildComparisonRows([plan(), plan({ reviews: 3, rating: 4.5 })]);
  const rating = rows.find((f) => f.icon === 'rating')!;
  expect(rating.values).toEqual(['Nueva', '4.5 ★ (3)']);
});

describe('buildComparisonRows (extra del port)', () => {
  test('sin planes no hay filas; con planes, las 10 filas en el orden de Dart', () => {
    expect(buildComparisonRows([])).toEqual([]);
    expect(buildComparisonRows([plan()]).map((f) => f.icon)).toEqual([
      'precio',
      'total',
      'duracion',
      'destino',
      'rating',
      'transporte',
      'comida',
      'hospedaje',
      'cupos',
      'cancelacion',
    ]);
  });

  test('precio y total como número crudo redondeado (toStringAsFixed(0)), total en singular con 1 persona', () => {
    const rows = buildComparisonRows([plan({ price: 165000 }), plan({ price: 99999.5 })]);
    expect(rows[0]!.title).toBe('Precio final por persona');
    expect(rows[0]!.values).toEqual(['165000', '100000']);
    expect(rows[1]!.title).toBe('Total para 2 personas');
    expect(rows[1]!.values).toEqual(['330000', '199999']);
    expect(buildComparisonRows([plan()], { pax: 1 })[1]!.title).toBe('Total para 1 persona');
  });

  test('incluidos, próximos cupos y cancelación', () => {
    const today = todayInBogota();
    const inThreeDays = localDate(today.getFullYear(), today.getMonth() + 1, today.getDate() + 3);
    const withDate = plan({
      includesTransport: true,
      cancellationPolicy: 'Gratis hasta 48 h antes',
      dates: [new PlanDate({ id: 'd', planId: 'p', date: inThreeDays, totalSpots: 10, availableSpots: 7 })],
    });
    const rows = buildComparisonRows([withDate, plan()]);
    const row = (k: string) => rows.find((f) => f.icon === k)!.values;
    expect(row('transporte')).toEqual(['✓ Incluido', '—']);
    expect(row('comida')).toEqual(['—', '—']);
    expect(row('cupos')).toEqual([`7 el ${inThreeDays.getDate()}/${inThreeDays.getMonth() + 1}`, 'Sin fechas']);
    expect(row('cancelacion')).toEqual(['Gratis hasta 48 h antes', '—']);
    expect(dateToIso(inThreeDays)).toMatch(/^\d{4}-\d\d-\d\d$/);
  });
});
