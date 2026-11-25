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

let catalogo: CatalogoFalso;

beforeEach(() => {
  catalogo = new CatalogoFalso({
    planes: [planDePrueba({ id: 'a' }), planDePrueba({ id: 'b' }), planDePrueba({ id: 'c' })],
    destinosDisponibles: ['Guatapé', 'Jardín'],
  });
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

/** Monta el hook y registra la secuencia de `cargando` que ve la vista (sus «notificaciones»). */
async function crear() {
  const estados: boolean[] = [];
  const r = await renderHook(() => {
    const vm = useCatalogViewModel({ catalogo });
    if (estados[estados.length - 1] !== vm.cargando) estados.push(vm.cargando);
    return vm;
  });
  return { ...r, estados };
}

const ids = (planes: readonly { id: string }[]) => planes.map((p) => p.id);

describe('carga', () => {
  test('antes de cargar: cargando y sin datos', async () => {
    const { result } = await crear();
    expect(result.current.cargando).toBe(true);
    expect(result.current.planes).toEqual([]);
    expect(result.current.destinos).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(catalogo.busquedas).toEqual([]);
  });

  test('éxito: planes y destinos, sin error, y notifica cargando → listo', async () => {
    const { result, estados } = await crear();
    estados.length = 0;

    await act(() => result.current.cargar());

    expect(ids(result.current.planes)).toEqual(['a', 'b', 'c']);
    expect(result.current.destinos).toEqual(['Guatapé', 'Jardín']);
    expect(result.current.cargando).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.errorDetalle).toBeNull();
    // Arranca en `true`: el primer cambio que ve la vista es el paso a «listo».
    expect(estados).toEqual([false]);
  });

  test('vacío: sin planes y sin error (la vista muestra «Sin resultados»)', async () => {
    catalogo.planes = [];
    const { result } = await crear();

    await act(() => result.current.cargar());

    expect(result.current.planes).toEqual([]);
    expect(result.current.cargando).toBe(false);
    expect(result.current.error).toBeNull();
  });

  test('error: mensaje para el usuario y detalle técnico; conserva lo anterior', async () => {
    const { result } = await crear();
    await act(() => result.current.cargar());
    catalogo.fallo = new Error('sin red');

    await act(() => result.current.cargar());

    expect(result.current.error).toBe('No pudimos cargar los planes. Revisa tu conexión e intenta de nuevo.');
    expect(result.current.errorDetalle).toContain('sin red');
    expect(result.current.cargando).toBe(false);
    expect(ids(result.current.planes)).toEqual(['a', 'b', 'c']);
  });

  test('reintentar tras un error limpia el error', async () => {
    catalogo.fallo = new Error('sin red');
    const { result } = await crear();
    await act(() => result.current.cargar());
    expect(result.current.error).not.toBeNull();
    catalogo.fallo = null;

    await act(() => result.current.cargar());

    expect(result.current.error).toBeNull();
    expect(result.current.errorDetalle).toBeNull();
    expect(result.current.planes).toHaveLength(3);
  });

  test('si falla `destinos` falla toda la carga (se piden en serie)', async () => {
    const { result } = await crear();
    const destinos = jest.spyOn(catalogo, 'destinations').mockRejectedValue(new Error('sin red'));

    await act(() => result.current.cargar());

    expect(destinos).toHaveBeenCalledTimes(1);
    expect(result.current.error).not.toBeNull();
  });
});

describe('filtros', () => {
  test('buscar envía el texto escrito; escribir solo no consulta', async () => {
    const { result } = await crear();
    await act(() => result.current.cargar());

    await act(() => result.current.setTexto('guatape'));
    expect(result.current.texto).toBe('guatape');
    expect(catalogo.busquedas).toHaveLength(1);

    await act(() => result.current.buscar());
    expect(catalogo.busquedas).toHaveLength(2);
    expect(catalogo.busquedas.at(-1)!.text).toBe('guatape');
  });

  test('toggleCategoria selecciona y, con la misma, deselecciona', async () => {
    const { result } = await crear();
    await act(() => result.current.toggleCategoria(ExperienceCategory.adventure));
    expect(result.current.categoria).toBe(ExperienceCategory.adventure);
    expect(catalogo.busquedas.at(-1)!.category).toBe(ExperienceCategory.adventure);

    await act(() => result.current.toggleCategoria(ExperienceCategory.adventure));
    expect(result.current.categoria).toBeNull();
    expect(catalogo.busquedas.at(-1)!.category).toBeNull();
  });

  test('aplicarFiltros: destino, precio y fecha con UNA sola consulta', async () => {
    const { result } = await crear();
    await act(() => result.current.cargar());
    const fecha = new Date(2026, 11, 24);

    await act(() => result.current.aplicarFiltros({ destino: 'Guatapé', precioMax: 150000, fecha }));

    expect(catalogo.busquedas).toHaveLength(2);
    expect(catalogo.consultasDestinos).toBe(2);
    const filtros = catalogo.busquedas.at(-1)!;
    expect(filtros.destination).toBe('Guatapé');
    expect(filtros.maxPrice).toBe(150000);
    expect(filtros.date).toEqual(fecha);
    expect(result.current.destino).toBe('Guatapé');
    expect(result.current.precioMax).toBe(150000);
    expect(result.current.fecha).toEqual(fecha);
    expect(result.current.filtrosActivos).toBe(3);
  });

  test('aplicarFiltros sin valores quita los tres filtros, también con una consulta', async () => {
    const { result } = await crear();
    await act(() => result.current.aplicarFiltros({ destino: 'Guatapé', precioMax: 1, fecha: new Date(2026, 11, 24) }));
    const antes = catalogo.busquedas.length;

    await act(() => result.current.aplicarFiltros());

    expect(catalogo.busquedas).toHaveLength(antes + 1);
    expect(result.current.filtrosActivos).toBe(0);
    expect(result.current.destino).toBeNull();
  });

  test('aplicarFiltros notifica una sola carga (cargando → listo)', async () => {
    const { result, estados } = await crear();
    await act(() => result.current.cargar());
    estados.length = 0;
    const puerta = (catalogo.compuerta = compuerta());

    let aplicando!: Promise<void>;
    await act(async () => {
      aplicando = result.current.aplicarFiltros({ destino: 'Jardín' });
    });
    await act(async () => {
      puerta.completar();
      await aplicando;
    });

    expect(estados).toEqual([true, false]);
  });

  test('PRESERVE: setDestino, setPrecioMax, setFecha y limpiarFiltros consultan una vez', async () => {
    const { result } = await crear();
    await act(() => result.current.setDestino('Jardín'));
    expect(catalogo.busquedas.at(-1)!.destination).toBe('Jardín');
    await act(() => result.current.setPrecioMax(90000));
    expect(catalogo.busquedas.at(-1)!.maxPrice).toBe(90000);
    await act(() => result.current.setFecha(new Date(2026, 11, 1)));
    expect(catalogo.busquedas.at(-1)!.date).toEqual(new Date(2026, 11, 1));
    expect(catalogo.busquedas).toHaveLength(3);
    expect(result.current.filtrosActivos).toBe(3);

    await act(() => result.current.limpiarFiltros());

    expect(catalogo.busquedas).toHaveLength(4);
    expect(result.current.filtrosActivos).toBe(0);
  });

  test('cambiarOrden consulta con el nuevo orden', async () => {
    const { result } = await crear();
    await act(() => result.current.cambiarOrden(CatalogSort.priceAsc));

    expect(result.current.orden).toBe(CatalogSort.priceAsc);
    expect(catalogo.busquedas.at(-1)!.sort).toBe(CatalogSort.priceAsc);
  });

  test('filtrosActivos no cuenta la categoría ni el texto', async () => {
    const { result } = await crear();
    await act(() => result.current.setTexto('café'));
    await act(() => result.current.toggleCategoria(ExperienceCategory.relax));
    expect(result.current.filtrosActivos).toBe(0);
  });
});

describe('selección para comparar', () => {
  test(`agrega, quita y respeta el máximo de ${MAX_COMPARAR}`, async () => {
    catalogo.planes = ['a', 'b', 'c', 'd'].map((id) => planDePrueba({ id }));
    const { result } = await crear();
    await act(() => result.current.cargar());
    const [a, b, c, d] = result.current.planes;

    await act(() => {
      result.current.toggleComparar(a!);
      result.current.toggleComparar(b!);
      result.current.toggleComparar(c!);
      result.current.toggleComparar(d!);
    });

    expect(ids(result.current.seleccion)).toEqual(['a', 'b', 'c']);
    expect(result.current.comparando(d!)).toBe(false);

    await act(() => result.current.toggleComparar(b!));
    expect(ids(result.current.seleccion)).toEqual(['a', 'c']);
    expect(result.current.comparando(b!)).toBe(false);

    await act(() => result.current.limpiarComparar());
    expect(result.current.seleccion).toEqual([]);
  });

  test('al recargar se descartan los seleccionados que ya no aparecen', async () => {
    const { result } = await crear();
    await act(() => result.current.cargar());
    await act(() => {
      result.current.toggleComparar(result.current.planes[0]!);
      result.current.toggleComparar(result.current.planes[1]!);
    });
    catalogo.planes = [planDePrueba({ id: 'b' })];

    await act(() => result.current.cargar());

    expect(ids(result.current.seleccion)).toEqual(['b']);
  });
});

describe('desmontar (dispose)', () => {
  test('una carga que termina después de desmontar no lanza', async () => {
    const { result, unmount } = await crear();
    const puerta = (catalogo.compuerta = compuerta());
    const carga = result.current.cargar();

    await unmount();
    puerta.completar();

    await expect(carga).resolves.toBeUndefined();
  });

  test('un error tardío después de desmontar tampoco lanza', async () => {
    const { result, unmount } = await crear();
    const puerta = (catalogo.compuerta = compuerta());
    catalogo.fallo = new Error('sin red');
    const carga = result.current.cargar();

    await unmount();
    puerta.completar();

    await expect(carga).resolves.toBeUndefined();
  });
});
