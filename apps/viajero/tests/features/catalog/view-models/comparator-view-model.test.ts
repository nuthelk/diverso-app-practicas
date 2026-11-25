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

let catalogo: CatalogoFalso;
beforeEach(() => {
  catalogo = new CatalogoFalso({ detalles: Object.fromEntries(['a', 'b', 'c'].map((id) => [id, plan(id)])) });
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

function crear(ids: string[], planesIniciales?: Plan[]) {
  return renderHook(() => useComparatorViewModel({ catalogo, ids, planesIniciales }));
}

const idsDe = (planes: readonly Plan[] | null) => planes?.map((p) => p.id);

test('carga los planes por id, en el orden de los ids', async () => {
  const { result } = await crear(['b', 'a']);
  expect(result.current.cargando).toBe(true);

  await act(() => result.current.cargar());

  expect(result.current.cargando).toBe(false);
  expect(idsDe(result.current.planes)).toEqual(['b', 'a']);
  expect(result.current.error).toBeNull();
});

test('sin ids no hay nada que cargar', async () => {
  const { result } = await crear([]);
  expect(result.current.cargando).toBe(false);
  expect(result.current.planes).toEqual([]);
  await act(() => result.current.cargar());
  expect(catalogo.detallesPedidos).toEqual([]);
});

test('los planes que ya se tenían (mismos ids) evitan la consulta', async () => {
  const { result } = await crear(['a', 'b'], [plan('a'), plan('b')]);
  expect(result.current.cargando).toBe(false);
  await act(() => result.current.cargar());
  expect(catalogo.detallesPedidos).toEqual([]);
  expect(idsDe(result.current.planes)).toEqual(['a', 'b']);
});

test('si los planes que se tenían no son los de la URL, se pide lo que dice la URL', async () => {
  const { result } = await crear(['a', 'c'], [plan('a'), plan('b')]);
  expect(result.current.cargando).toBe(true);
  await act(() => result.current.cargar());
  expect(catalogo.detallesPedidos).toEqual(['a', 'c']);
  expect(idsDe(result.current.planes)).toEqual(['a', 'c']);
});

test('los mismos ids en otro orden tampoco cuentan: se pide lo que dice la URL', async () => {
  const { result } = await crear(['b', 'a'], [plan('a'), plan('b')]);
  expect(result.current.cargando).toBe(true);
  await act(() => result.current.cargar());
  expect(catalogo.detallesPedidos).toEqual(['b', 'a']);
});

test('si falla queda con el mensaje y «cargar» de nuevo se recupera', async () => {
  catalogo.fallo = new Error('sin red');
  const { result } = await crear(['a', 'b']);

  await act(() => result.current.cargar());
  expect(result.current.planes).toBeNull();
  expect(result.current.cargando).toBe(false);
  expect(result.current.error).toBe('No pudimos cargar los planes. Revisa tu conexión e intenta de nuevo.');

  catalogo.fallo = null;
  await act(() => result.current.cargar());
  expect(result.current.error).toBeNull();
  expect(result.current.planes).toHaveLength(2);
});

test('una respuesta que llega después de desmontar no lanza', async () => {
  const { result, unmount } = await crear(['a']);
  const puerta = (catalogo.compuerta = compuerta());
  const carga = result.current.cargar();

  await unmount();
  puerta.completar();

  await expect(carga).resolves.toBeUndefined();
});
