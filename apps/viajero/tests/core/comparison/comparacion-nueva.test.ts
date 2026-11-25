import { buildComparisonRows } from '@/core/comparison/comparison-row';
import { ExperienceCategory, PlanStatus } from '@/core/models/enums';
import { Plan, PlanDate } from '@/core/models/plan';
import { fechaLocal, fechaToIso } from '@/core/utils/fechas';
import { hoyBogota } from '@/core/utils/hora-bogota';

const plan = ({
  reviews = 0,
  rating = 0,
  precio = 100000,
  ...resto
}: { reviews?: number; rating?: number; precio?: number } & Partial<ConstructorParameters<typeof Plan>[0]> = {}) =>
  new Plan({
    id: 'p',
    agencyId: 'a',
    title: 'Plan',
    destination: 'Jericó',
    category: ExperienceCategory.culture,
    priceCop: precio,
    status: PlanStatus.published,
    averageRating: rating,
    reviewsCount: reviews,
    ...resto,
  });

test('Plan.esNuevo: sin reseñas aunque el promedio venga en 0', () => {
  expect(plan().isNew).toBe(true);
  expect(plan({ reviews: 2, rating: 4.5 }).isNew).toBe(false);
});

test('el comparador dice «Nueva» para un plan sin reseñas y conserva el formato con reseñas', () => {
  const filas = buildComparisonRows([plan(), plan({ reviews: 3, rating: 4.5 })]);
  const rating = filas.find((f) => f.icono === 'rating')!;
  expect(rating.valores).toEqual(['Nueva', '4.5 ★ (3)']);
});

describe('buildComparisonRows (extra del port)', () => {
  test('sin planes no hay filas; con planes, las 10 filas en el orden de Dart', () => {
    expect(buildComparisonRows([])).toEqual([]);
    expect(buildComparisonRows([plan()]).map((f) => f.icono)).toEqual([
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
    const filas = buildComparisonRows([plan({ precio: 165000 }), plan({ precio: 99999.5 })]);
    expect(filas[0]!.titulo).toBe('Precio final por persona');
    expect(filas[0]!.valores).toEqual(['165000', '100000']);
    expect(filas[1]!.titulo).toBe('Total para 2 personas');
    expect(filas[1]!.valores).toEqual(['330000', '199999']);
    expect(buildComparisonRows([plan()], { pax: 1 })[1]!.titulo).toBe('Total para 1 persona');
  });

  test('incluidos, próximos cupos y cancelación', () => {
    const hoy = hoyBogota();
    const enTres = fechaLocal(hoy.getFullYear(), hoy.getMonth() + 1, hoy.getDate() + 3);
    const conFecha = plan({
      includesTransport: true,
      cancellationPolicy: 'Gratis hasta 48 h antes',
      dates: [new PlanDate({ id: 'd', planId: 'p', date: enTres, totalSpots: 10, availableSpots: 7 })],
    });
    const filas = buildComparisonRows([conFecha, plan()]);
    const fila = (k: string) => filas.find((f) => f.icono === k)!.valores;
    expect(fila('transporte')).toEqual(['✓ Incluido', '—']);
    expect(fila('comida')).toEqual(['—', '—']);
    expect(fila('cupos')).toEqual([`7 el ${enTres.getDate()}/${enTres.getMonth() + 1}`, 'Sin fechas']);
    expect(fila('cancelacion')).toEqual(['Gratis hasta 48 h antes', '—']);
    expect(fechaToIso(enTres)).toMatch(/^\d{4}-\d\d-\d\d$/);
  });
});
