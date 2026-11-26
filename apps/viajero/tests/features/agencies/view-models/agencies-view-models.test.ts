import { act, renderHook } from '@testing-library/react-native';

import { AgencySummary, AgencySort, type Plan } from '@/core';
import { useAgencyViewModel } from '@/features/agencies/view-models/useAgencyViewModel';
import { useAgenciesViewModel } from '@/features/agencies/view-models/useAgenciesViewModel';

import { FakeCatalogRepository, testPlan } from '../../../support/fake-catalog-repository';
import { createGate } from '../../../support/gate';

/**
 * View models de la pestaña «Agencias» y de la página de una agencia con un catálogo falso:
 * carga, vacío, error, orden (sin re-consultar) y protección tras desmontar. Port 1:1 de
 * `agencias_view_model_test.dart` y `agencia_view_model_test.dart`.
 */

const rutas = new AgencySummary({
  id: 'ag-rutas',
  name: 'Rutas de Antioquia Cultural',
  city: 'Medellín',
  planCount: 2,
  rating: 4.5,
  reviewsTotal: 2,
});
const eco = new AgencySummary({ id: 'ag-eco', name: 'EcoAndes Viajes', city: 'Envigado', planCount: 5 });
const cafe = new AgencySummary({
  id: 'ag-cafe',
  name: 'Café y Montaña Tours',
  city: 'Jardín',
  planCount: 3,
  rating: 5.0,
  reviewsTotal: 3,
});

let catalog: FakeCatalogRepository;
beforeEach(() => {
  catalog = new FakeCatalogRepository({
    publicAgencies: [rutas, eco, cafe],
    plansByAgency: { 'ag-rutas': [testPlan({ id: 'plan-1' }), testPlan({ id: 'plan-2' })] },
  });
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

const ids = (xs: readonly { id: string }[]) => xs.map((x) => x.id);

describe('AgenciesViewModel', () => {
  async function setup() {
    const loadingStates: boolean[] = [];
    let renders = 0;
    const r = await renderHook(() => {
      renders++;
      const vm = useAgenciesViewModel({ catalog });
      if (loadingStates[loadingStates.length - 1] !== vm.loading) loadingStates.push(vm.loading);
      return vm;
    });
    return { ...r, loadingStates, renders: () => renders };
  }

  describe('carga', () => {
    test('antes de cargar: cargando y sin datos', async () => {
      const { result } = await setup();
      expect(result.current.loading).toBe(true);
      expect(result.current.agencies).toEqual([]);
      expect(result.current.hasAgencies).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.sort).toBe(AgencySort.score);
      expect(catalog.agencyQueries).toBe(0);
    });

    test('éxito: agencias, sin error, y notifica cargando → listo', async () => {
      const { result, loadingStates } = await setup();
      await act(() => result.current.load());

      expect(result.current.agencies).toHaveLength(3);
      expect(result.current.hasAgencies).toBe(true);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.errorDetails).toBeNull();
      expect(loadingStates).toEqual([true, false]);
    });

    test('vacío: sin agencias y sin error (la vista muestra «Aún no hay agencias»)', async () => {
      catalog.publicAgencies = [];
      const { result } = await setup();
      await act(() => result.current.load());

      expect(result.current.agencies).toEqual([]);
      expect(result.current.hasAgencies).toBe(false);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    test('error: mensaje para el usuario y detalle técnico, sin agencias', async () => {
      catalog.failure = new Error('sin red');
      const { result } = await setup();
      await act(() => result.current.load());

      expect(result.current.error).toBe('No pudimos cargar las agencias. Revisa tu conexión e intenta de nuevo.');
      expect(result.current.errorDetails).toContain('sin red');
      expect(result.current.agencies).toEqual([]);
      expect(result.current.loading).toBe(false);
    });

    test('reintentar tras un error: limpia el error y muestra las agencias', async () => {
      catalog.failure = new Error('sin red');
      const { result } = await setup();
      await act(() => result.current.load());
      catalog.failure = null;
      await act(() => result.current.load());

      expect(result.current.error).toBeNull();
      expect(result.current.errorDetails).toBeNull();
      expect(result.current.agencies).toHaveLength(3);
    });

    test('una recarga que falla conserva las agencias ya cargadas', async () => {
      const { result } = await setup();
      await act(() => result.current.load());
      catalog.failure = new Error('sin red');
      await act(() => result.current.load());

      expect(result.current.error).not.toBeNull();
      expect(result.current.agencies).toHaveLength(3);
    });

    test('la lista expuesta es de solo lectura', async () => {
      const { result } = await setup();
      await act(() => result.current.load());

      expect(() => (result.current.agencies as AgencySummary[]).push(eco)).toThrow();
    });
  });

  describe('orden', () => {
    test('por defecto, por puntaje: mayor primero y las «Nueva» al final', async () => {
      const { result } = await setup();
      await act(() => result.current.load());
      expect(ids(result.current.agencies)).toEqual(['ag-cafe', 'ag-rutas', 'ag-eco']);
    });

    test('más planes: de más a menos planes', async () => {
      const { result } = await setup();
      await act(() => result.current.load());
      await act(() => result.current.setSort(AgencySort.mostPlans));

      expect(result.current.sort).toBe(AgencySort.mostPlans);
      expect(ids(result.current.agencies)).toEqual(['ag-eco', 'ag-cafe', 'ag-rutas']);
    });

    test('nombre: alfabético sin tildes ni mayúsculas', async () => {
      const { result } = await setup();
      await act(() => result.current.load());
      await act(() => result.current.setSort(AgencySort.name));

      expect(ids(result.current.agencies)).toEqual(['ag-cafe', 'ag-eco', 'ag-rutas']);
    });

    test('cambiar el orden notifica y no vuelve a consultar', async () => {
      const { result, renders } = await setup();
      await act(() => result.current.load());
      const before = renders();

      await act(() => result.current.setSort(AgencySort.name));

      expect(renders()).toBe(before + 1);
      expect(catalog.agencyQueries).toBe(1);
    });

    test('elegir el orden que ya está activo no notifica', async () => {
      const { result, renders } = await setup();
      await act(() => result.current.load());
      const before = renders();

      await act(() => result.current.setSort(AgencySort.score));

      expect(renders()).toBe(before);
    });

    test('el orden elegido se conserva al recargar', async () => {
      const { result } = await setup();
      await act(() => result.current.load());
      await act(() => result.current.setSort(AgencySort.name));
      await act(() => result.current.load());

      expect(result.current.sort).toBe(AgencySort.name);
      expect(ids(result.current.agencies)).toEqual(['ag-cafe', 'ag-eco', 'ag-rutas']);
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
});

describe('AgencyViewModel', () => {
  async function setup(agencyId = 'ag-rutas') {
    const loadingStates: boolean[] = [];
    const r = await renderHook(() => {
      const vm = useAgencyViewModel({ catalog, agencyId });
      if (loadingStates[loadingStates.length - 1] !== vm.loading) loadingStates.push(vm.loading);
      return vm;
    });
    return { ...r, loadingStates };
  }

  test('antes de cargar: cargando y sin datos', async () => {
    const { result } = await setup();
    expect(result.current.loading).toBe(true);
    expect(result.current.agency).toBeNull();
    expect(result.current.plans).toEqual([]);
    expect(result.current.notFound).toBe(false);
    expect(result.current.error).toBeNull();
    expect(catalog.requestedAgencyIds).toEqual([]);
  });

  test('éxito: la agencia y sus planes, pedidos por id, y notifica cargando → listo', async () => {
    const { result, loadingStates } = await setup();
    await act(() => result.current.load());

    expect(result.current.agency?.id).toBe('ag-rutas');
    expect(ids(result.current.plans)).toEqual(['plan-1', 'plan-2']);
    expect(result.current.notFound).toBe(false);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.errorDetails).toBeNull();
    expect(catalog.requestedAgencyIds).toEqual(['ag-rutas']);
    expect(loadingStates).toEqual([true, false]);
  });

  test('agencia sin planes publicados: existe y la lista está vacía', async () => {
    catalog.plansByAgency.clear();
    const { result } = await setup();
    await act(() => result.current.load());

    expect(result.current.agency).not.toBeNull();
    expect(result.current.plans).toEqual([]);
    expect(result.current.notFound).toBe(false);
  });

  test('agencia que no existe o no está habilitada: noEncontrada, sin error', async () => {
    const { result } = await setup('ag-fantasma');
    await act(() => result.current.load());

    expect(result.current.notFound).toBe(true);
    expect(result.current.agency).toBeNull();
    expect(result.current.plans).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  test('error: mensaje para el usuario y detalle técnico, sin agencia', async () => {
    catalog.failure = new Error('sin red');
    const { result } = await setup();
    await act(() => result.current.load());

    expect(result.current.error).toBe('No pudimos cargar la agencia. Revisa tu conexión e intenta de nuevo.');
    expect(result.current.errorDetails).toContain('sin red');
    expect(result.current.agency).toBeNull();
    expect(result.current.notFound).toBe(false);
    expect(result.current.loading).toBe(false);
  });

  test('reintentar tras un error: limpia el error y muestra la agencia', async () => {
    catalog.failure = new Error('sin red');
    const { result } = await setup();
    await act(() => result.current.load());
    catalog.failure = null;
    await act(() => result.current.load());

    expect(result.current.error).toBeNull();
    expect(result.current.errorDetails).toBeNull();
    expect(result.current.agency?.id).toBe('ag-rutas');
  });

  test('una recarga que falla conserva la agencia ya cargada', async () => {
    const { result } = await setup();
    await act(() => result.current.load());
    catalog.failure = new Error('sin red');
    await act(() => result.current.load());

    expect(result.current.error).not.toBeNull();
    expect(result.current.agency?.id).toBe('ag-rutas');
    expect(result.current.plans).toHaveLength(2);
  });

  test('la lista de planes expuesta es de solo lectura', async () => {
    const { result } = await setup();
    await act(() => result.current.load());

    expect(() => (result.current.plans as Plan[]).push(testPlan())).toThrow();
  });

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
