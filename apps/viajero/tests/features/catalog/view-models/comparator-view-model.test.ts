import { act, renderHook } from '@testing-library/react-native';

import { ExperienceCategory, Plan, PlanStatus } from '@/core';
import { useComparatorViewModel } from '@/features/catalog/view-models/useComparatorViewModel';

import { CatalogoFalso } from '../../../support/catalogo-falso';
import { compuerta } from '../../../support/compuerta';

/**
 * `useComparatorViewModel`: carga por ids en orden, sin ids no consulta, los planes que ya se
 * tenían solo se usan si son los de la URL, y el error se recupera. Port 1:1 de
 * `comparator_view_model_test.dart`.
 */

const plan = (id: string) =>
  new Plan({
    id,
    agencyId: 'ag-1',
    title: `Plan ${id}`,
    destination: 'Guatapé',
    category: ExperienceCategory.adventure,
    priceCop: 150000,
    status: PlanStatus.published,
  });

let catalog: CatalogoFalso;
beforeEach(() => {
  catalog = new CatalogoFalso({ detalles: Object.fromEntries(['a', 'b', 'c'].map((id) => [id, plan(id)])) });
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

function setup(ids: string[], initialPlans?: Plan[]) {
  return renderHook(() => useComparatorViewModel({ catalog, ids, initialPlans }));
}

const idsOf = (plans: readonly Plan[] | null) => plans?.map((p) => p.id);

test('carga los planes por id, en el orden de los ids', async () => {
  const { result } = await setup(['b', 'a']);
  expect(result.current.loading).toBe(true);

  await act(() => result.current.load());

  expect(result.current.loading).toBe(false);
  expect(idsOf(result.current.plans)).toEqual(['b', 'a']);
  expect(result.current.error).toBeNull();
});

test('sin ids no hay nada que cargar', async () => {
  const { result } = await setup([]);
  expect(result.current.loading).toBe(false);
  expect(result.current.plans).toEqual([]);
  await act(() => result.current.load());
  expect(catalog.detallesPedidos).toEqual([]);
});

test('los planes que ya se tenían (mismos ids) evitan la consulta', async () => {
  const { result } = await setup(['a', 'b'], [plan('a'), plan('b')]);
  expect(result.current.loading).toBe(false);
  await act(() => result.current.load());
  expect(catalog.detallesPedidos).toEqual([]);
  expect(idsOf(result.current.plans)).toEqual(['a', 'b']);
});

test('si los planes que se tenían no son los de la URL, se pide lo que dice la URL', async () => {
  const { result } = await setup(['a', 'c'], [plan('a'), plan('b')]);
  expect(result.current.loading).toBe(true);
  await act(() => result.current.load());
  expect(catalog.detallesPedidos).toEqual(['a', 'c']);
  expect(idsOf(result.current.plans)).toEqual(['a', 'c']);
});

test('los mismos ids en otro orden tampoco cuentan: se pide lo que dice la URL', async () => {
  const { result } = await setup(['b', 'a'], [plan('a'), plan('b')]);
  expect(result.current.loading).toBe(true);
  await act(() => result.current.load());
  expect(catalog.detallesPedidos).toEqual(['b', 'a']);
});

test('si falla queda con el mensaje y «cargar» de nuevo se recupera', async () => {
  catalog.fallo = new Error('sin red');
  const { result } = await setup(['a', 'b']);

  await act(() => result.current.load());
  expect(result.current.plans).toBeNull();
  expect(result.current.loading).toBe(false);
  expect(result.current.error).toBe('No pudimos cargar los planes. Revisa tu conexión e intenta de nuevo.');

  catalog.fallo = null;
  await act(() => result.current.load());
  expect(result.current.error).toBeNull();
  expect(result.current.plans).toHaveLength(2);
});

test('una respuesta que llega después de desmontar no lanza', async () => {
  const { result, unmount } = await setup(['a']);
  const gate = (catalog.compuerta = compuerta());
  const pending = result.current.load();

  await unmount();
  gate.completar();

  await expect(pending).resolves.toBeUndefined();
});
