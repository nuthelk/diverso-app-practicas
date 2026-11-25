import { act, renderHook } from '@testing-library/react-native';

import { ExperienceCategory, CatalogSort } from '@/core';
import { MAX_COMPARAR, useCatalogViewModel } from '@/features/catalog/view-models/useCatalogViewModel';

import { CatalogoFalso, planDePrueba } from '../../../support/catalogo-falso';
import { compuerta } from '../../../support/compuerta';

/**
 * `useCatalogViewModel` con un catálogo falso: carga, error, vacío, filtros (una sola consulta por
 * comando), selección para comparar y protección tras desmontar. Port 1:1 de
 * `catalog_view_model_test.dart`.
 */

let catalog: CatalogoFalso;

beforeEach(() => {
  catalog = new CatalogoFalso({
    planes: [planDePrueba({ id: 'a' }), planDePrueba({ id: 'b' }), planDePrueba({ id: 'c' })],
    destinosDisponibles: ['Guatapé', 'Jardín'],
  });
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

/** Monta el hook y registra la secuencia de `cargando` que ve la vista (sus «notificaciones»). */
async function setup() {
  const loadingStates: boolean[] = [];
  const r = await renderHook(() => {
    const vm = useCatalogViewModel({ catalog });
    if (loadingStates[loadingStates.length - 1] !== vm.loading) loadingStates.push(vm.loading);
    return vm;
  });
  return { ...r, loadingStates };
}

const ids = (plans: readonly { id: string }[]) => plans.map((p) => p.id);

describe('carga', () => {
  test('antes de cargar: cargando y sin datos', async () => {
    const { result } = await setup();
    expect(result.current.loading).toBe(true);
    expect(result.current.plans).toEqual([]);
    expect(result.current.destinations).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(catalog.busquedas).toEqual([]);
  });

  test('éxito: planes y destinos, sin error, y notifica cargando → listo', async () => {
    const { result, loadingStates } = await setup();
    loadingStates.length = 0;

    await act(() => result.current.load());

    expect(ids(result.current.plans)).toEqual(['a', 'b', 'c']);
    expect(result.current.destinations).toEqual(['Guatapé', 'Jardín']);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.errorDetails).toBeNull();
    // Arranca en `true`: el primer cambio que ve la vista es el paso a «listo».
    expect(loadingStates).toEqual([false]);
  });

  test('vacío: sin planes y sin error (la vista muestra «Sin resultados»)', async () => {
    catalog.planes = [];
    const { result } = await setup();

    await act(() => result.current.load());

    expect(result.current.plans).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  test('error: mensaje para el usuario y detalle técnico; conserva lo anterior', async () => {
    const { result } = await setup();
    await act(() => result.current.load());
    catalog.fallo = new Error('sin red');

    await act(() => result.current.load());

    expect(result.current.error).toBe('No pudimos cargar los planes. Revisa tu conexión e intenta de nuevo.');
    expect(result.current.errorDetails).toContain('sin red');
    expect(result.current.loading).toBe(false);
    expect(ids(result.current.plans)).toEqual(['a', 'b', 'c']);
  });

  test('reintentar tras un error limpia el error', async () => {
    catalog.fallo = new Error('sin red');
    const { result } = await setup();
    await act(() => result.current.load());
    expect(result.current.error).not.toBeNull();
    catalog.fallo = null;

    await act(() => result.current.load());

    expect(result.current.error).toBeNull();
    expect(result.current.errorDetails).toBeNull();
    expect(result.current.plans).toHaveLength(3);
  });

  test('si falla `destinos` falla toda la carga (se piden en serie)', async () => {
    const { result } = await setup();
    const destinationsSpy = jest.spyOn(catalog, 'destinations').mockRejectedValue(new Error('sin red'));

    await act(() => result.current.load());

    expect(destinationsSpy).toHaveBeenCalledTimes(1);
    expect(result.current.error).not.toBeNull();
  });
});

describe('filtros', () => {
  test('buscar envía el texto escrito; escribir solo no consulta', async () => {
    const { result } = await setup();
    await act(() => result.current.load());

    await act(() => result.current.setText('guatape'));
    expect(result.current.text).toBe('guatape');
    expect(catalog.busquedas).toHaveLength(1);

    await act(() => result.current.search());
    expect(catalog.busquedas).toHaveLength(2);
    expect(catalog.busquedas.at(-1)!.text).toBe('guatape');
  });

  test('toggleCategoria selecciona y, con la misma, deselecciona', async () => {
    const { result } = await setup();
    await act(() => result.current.toggleCategory(ExperienceCategory.adventure));
    expect(result.current.category).toBe(ExperienceCategory.adventure);
    expect(catalog.busquedas.at(-1)!.category).toBe(ExperienceCategory.adventure);

    await act(() => result.current.toggleCategory(ExperienceCategory.adventure));
    expect(result.current.category).toBeNull();
    expect(catalog.busquedas.at(-1)!.category).toBeNull();
  });

  test('aplicarFiltros: destino, precio y fecha con UNA sola consulta', async () => {
    const { result } = await setup();
    await act(() => result.current.load());
    const date = new Date(2026, 11, 24);

    await act(() => result.current.applyFilters({ destination: 'Guatapé', maxPrice: 150000, date }));

    expect(catalog.busquedas).toHaveLength(2);
    expect(catalog.consultasDestinos).toBe(2);
    const filters = catalog.busquedas.at(-1)!;
    expect(filters.destination).toBe('Guatapé');
    expect(filters.maxPrice).toBe(150000);
    expect(filters.date).toEqual(date);
    expect(result.current.destination).toBe('Guatapé');
    expect(result.current.maxPrice).toBe(150000);
    expect(result.current.date).toEqual(date);
    expect(result.current.activeFilterCount).toBe(3);
  });

  test('aplicarFiltros sin valores quita los tres filtros, también con una consulta', async () => {
    const { result } = await setup();
    await act(() => result.current.applyFilters({ destination: 'Guatapé', maxPrice: 1, date: new Date(2026, 11, 24) }));
    const before = catalog.busquedas.length;

    await act(() => result.current.applyFilters());

    expect(catalog.busquedas).toHaveLength(before + 1);
    expect(result.current.activeFilterCount).toBe(0);
    expect(result.current.destination).toBeNull();
  });

  test('aplicarFiltros notifica una sola carga (cargando → listo)', async () => {
    const { result, loadingStates } = await setup();
    await act(() => result.current.load());
    loadingStates.length = 0;
    const gate = (catalog.compuerta = compuerta());

    let applying!: Promise<void>;
    await act(async () => {
      applying = result.current.applyFilters({ destination: 'Jardín' });
    });
    await act(async () => {
      gate.completar();
      await applying;
    });

    expect(loadingStates).toEqual([true, false]);
  });

  test('PRESERVE: setDestino, setPrecioMax, setFecha y limpiarFiltros consultan una vez', async () => {
    const { result } = await setup();
    await act(() => result.current.setDestination('Jardín'));
    expect(catalog.busquedas.at(-1)!.destination).toBe('Jardín');
    await act(() => result.current.setMaxPrice(90000));
    expect(catalog.busquedas.at(-1)!.maxPrice).toBe(90000);
    await act(() => result.current.setDate(new Date(2026, 11, 1)));
    expect(catalog.busquedas.at(-1)!.date).toEqual(new Date(2026, 11, 1));
    expect(catalog.busquedas).toHaveLength(3);
    expect(result.current.activeFilterCount).toBe(3);

    await act(() => result.current.clearFilters());

    expect(catalog.busquedas).toHaveLength(4);
    expect(result.current.activeFilterCount).toBe(0);
  });

  test('cambiarOrden consulta con el nuevo orden', async () => {
    const { result } = await setup();
    await act(() => result.current.setSort(CatalogSort.priceAsc));

    expect(result.current.sort).toBe(CatalogSort.priceAsc);
    expect(catalog.busquedas.at(-1)!.sort).toBe(CatalogSort.priceAsc);
  });

  test('filtrosActivos no cuenta la categoría ni el texto', async () => {
    const { result } = await setup();
    await act(() => result.current.setText('café'));
    await act(() => result.current.toggleCategory(ExperienceCategory.relax));
    expect(result.current.activeFilterCount).toBe(0);
  });
});

describe('selección para comparar', () => {
  test(`agrega, quita y respeta el máximo de ${MAX_COMPARAR}`, async () => {
    catalog.planes = ['a', 'b', 'c', 'd'].map((id) => planDePrueba({ id }));
    const { result } = await setup();
    await act(() => result.current.load());
    const [a, b, c, d] = result.current.plans;

    await act(() => {
      result.current.toggleCompare(a!);
      result.current.toggleCompare(b!);
      result.current.toggleCompare(c!);
      result.current.toggleCompare(d!);
    });

    expect(ids(result.current.selection)).toEqual(['a', 'b', 'c']);
    expect(result.current.isComparing(d!)).toBe(false);

    await act(() => result.current.toggleCompare(b!));
    expect(ids(result.current.selection)).toEqual(['a', 'c']);
    expect(result.current.isComparing(b!)).toBe(false);

    await act(() => result.current.clearCompare());
    expect(result.current.selection).toEqual([]);
  });

  test('al recargar se descartan los seleccionados que ya no aparecen', async () => {
    const { result } = await setup();
    await act(() => result.current.load());
    await act(() => {
      result.current.toggleCompare(result.current.plans[0]!);
      result.current.toggleCompare(result.current.plans[1]!);
    });
    catalog.planes = [planDePrueba({ id: 'b' })];

    await act(() => result.current.load());

    expect(ids(result.current.selection)).toEqual(['b']);
  });
});

describe('desmontar (dispose)', () => {
  test('una carga que termina después de desmontar no lanza', async () => {
    const { result, unmount } = await setup();
    const gate = (catalog.compuerta = compuerta());
    const pending = result.current.load();

    await unmount();
    gate.completar();

    await expect(pending).resolves.toBeUndefined();
  });

  test('un error tardío después de desmontar tampoco lanza', async () => {
    const { result, unmount } = await setup();
    const gate = (catalog.compuerta = compuerta());
    catalog.fallo = new Error('sin red');
    const pending = result.current.load();

    await unmount();
    gate.completar();

    await expect(pending).resolves.toBeUndefined();
  });
});
