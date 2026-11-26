import { act, renderHook } from '@testing-library/react-native';

import { Review } from '@/core';
import { MAX_REVIEWS, usePlanDetailViewModel } from '@/features/plan/view-models/usePlanDetailViewModel';

import { FakeCatalogRepository, testPlanDate, testPlan, FakeReviews } from '../../../support/fake-catalog-repository';
import { createGate } from '../../../support/gate';

/**
 * `usePlanDetailViewModel` con repositorios falsos: carga plan + reseñas (una consulta de cada
 * una), error (también si fallan las reseñas), plan sin fechas, selección de fecha derivada y
 * protección tras desmontar. Port 1:1 de `plan_detail_view_model_test.dart`.
 */

const makeReview = (id: string) =>
  new Review({ id, bookingId: `b-${id}`, planId: 'plan-1', travelerId: `v-${id}`, rating: 5, createdAt: new Date(2026, 9, 1) });

let catalog: FakeCatalogRepository;
let reviews: FakeReviews;

beforeEach(() => {
  catalog = new FakeCatalogRepository({
    details: {
      'plan-1': testPlan({
        reviewsCount: 2,
        dates: [testPlanDate('f-3', { days: 9 }), testPlanDate('f-1'), testPlanDate('f-2', { days: 5 })],
      }),
    },
  });
  reviews = new FakeReviews([makeReview('r1'), makeReview('r2')]);
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

async function setup() {
  const loadingStates: boolean[] = [];
  let renders = 0;
  const r = await renderHook(() => {
    renders++;
    const vm = usePlanDetailViewModel({ catalog, reviews, planId: 'plan-1' });
    if (loadingStates[loadingStates.length - 1] !== vm.loading) loadingStates.push(vm.loading);
    return vm;
  });
  return { ...r, loadingStates, renders: () => renders };
}

const ids = (xs: readonly { id: string }[]) => xs.map((x) => x.id);

describe('carga', () => {
  test('antes de cargar: cargando, sin plan ni error', async () => {
    const { result } = await setup();
    expect(result.current.loading).toBe(true);
    expect(result.current.plan).toBeNull();
    expect(result.current.reviews).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(result.current.dates).toEqual([]);
    expect(result.current.selectedDate).toBeNull();
  });

  test('éxito: plan y reseñas con una consulta de cada una, cargando → listo', async () => {
    const { result, loadingStates } = await setup();
    await act(() => result.current.load());

    expect(result.current.plan!.id).toBe('plan-1');
    expect(ids(result.current.reviews)).toEqual(['r1', 'r2']);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(catalog.requestedPlanIds).toEqual(['plan-1']);
    expect(reviews.requestedPlanIds).toEqual(['plan-1']);
    expect(reviews.limits).toEqual([MAX_REVIEWS]);
    expect(MAX_REVIEWS).toBe(4);
    expect(loadingStates).toEqual([true, false]);
  });

  test('vacío: plan sin fechas ni reseñas', async () => {
    catalog.details.set('plan-1', testPlan());
    reviews.reviews = [];
    const { result } = await setup();
    await act(() => result.current.load());

    expect(result.current.plan).not.toBeNull();
    expect(result.current.reviews).toEqual([]);
    expect(result.current.dates).toEqual([]);
    expect(result.current.selectedDate).toBeNull();
    expect(result.current.error).toBeNull();
  });

  test('error al cargar el plan: mensaje para el usuario y sin plan', async () => {
    catalog.failure = new Error('sin red');
    const { result } = await setup();
    await act(() => result.current.load());

    expect(result.current.error).toBe('Revisa tu conexión e intenta de nuevo.');
    expect(result.current.plan).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  test('error al cargar las reseñas: toda la ficha falla, como antes', async () => {
    reviews.failure = new Error('sin red');
    const { result } = await setup();
    await act(() => result.current.load());

    expect(result.current.error).not.toBeNull();
    expect(result.current.plan).toBeNull();
  });

  test('reintentar tras un error carga el plan y limpia el error', async () => {
    catalog.failure = new Error('sin red');
    const { result } = await setup();
    await act(() => result.current.load());
    catalog.failure = null;
    await act(() => result.current.load());

    expect(result.current.error).toBeNull();
    expect(result.current.plan!.id).toBe('plan-1');
  });
});

describe('fecha seleccionada', () => {
  test('por defecto la más cercana; fechas de la más próxima a la más lejana', async () => {
    const { result } = await setup();
    await act(() => result.current.load());

    expect(ids(result.current.dates)).toEqual(['f-1', 'f-2', 'f-3']);
    expect(result.current.selectedDate!.id).toBe('f-1');
  });

  test('seleccionarFecha cambia la selección y notifica', async () => {
    const { result, renders } = await setup();
    await act(() => result.current.load());
    const before = renders();

    await act(() => result.current.selectDate(result.current.dates[2]!));

    expect(result.current.selectedDate!.id).toBe('f-3');
    expect(renders()).toBe(before + 1);
  });

  test('leer la selección no la modifica ni notifica (nada se muta al leer)', async () => {
    const { result, renders } = await setup();
    await act(() => result.current.load());
    await act(() => result.current.selectDate(result.current.dates[1]!));
    const before = renders();

    for (let i = 0; i < 3; i++) {
      expect(result.current.selectedDate!.id).toBe('f-2');
      expect(result.current.dates).toHaveLength(3);
    }

    expect(renders()).toBe(before);
  });

  test('una fecha que no está entre las disponibles se ignora', async () => {
    const { result } = await setup();
    await act(() => result.current.load());
    await act(() => result.current.selectDate(result.current.dates[1]!));

    await act(() => result.current.selectDate(testPlanDate('otra')));

    expect(result.current.selectedDate!.id).toBe('f-2');
  });

  test('al recargar la selección vuelve a la primera fecha', async () => {
    const { result } = await setup();
    await act(() => result.current.load());
    await act(() => result.current.selectDate(result.current.dates[2]!));

    await act(() => result.current.load());

    expect(result.current.selectedDate!.id).toBe('f-1');
  });
});

describe('desmontar (dispose)', () => {
  test('una carga que termina después de desmontar no lanza', async () => {
    const { result, unmount } = await setup();
    const gate = (catalog.gate = createGate());
    const pending = result.current.load();
    await unmount();
    gate.resolve();
    await expect(pending).resolves.toBeUndefined();
  });

  test('un error tardío después de desmontar tampoco lanza', async () => {
    const { result, unmount } = await setup();
    const gate = (catalog.gate = createGate());
    catalog.failure = new Error('sin red');
    const pending = result.current.load();
    await unmount();
    gate.resolve();
    await expect(pending).resolves.toBeUndefined();
  });
});
