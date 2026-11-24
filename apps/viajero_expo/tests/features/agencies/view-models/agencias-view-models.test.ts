import { act, renderHook } from '@testing-library/react-native';

import { AgenciaResumen, OrdenAgencias, type Plan } from '@/core';
import { useAgenciaViewModel } from '@/features/agencies/view-models/useAgenciaViewModel';
import { useAgenciasViewModel } from '@/features/agencies/view-models/useAgenciasViewModel';

import { CatalogoFalso, planDePrueba } from '../../../support/catalogo-falso';
import { compuerta } from '../../../support/compuerta';

/**
 * View models de la pestaña «Agencias» y de la página de una agencia con un catálogo falso:
 * carga, vacío, error, orden (sin re-consultar) y protección tras desmontar. Port 1:1 de
 * `agencias_view_model_test.dart` y `agencia_view_model_test.dart`.
 */

const rutas = new AgenciaResumen({
  id: 'ag-rutas',
  nombre: 'Rutas de Antioquia Cultural',
  ciudad: 'Medellín',
  planesCount: 2,
  rating: 4.5,
  reviewsTotal: 2,
});
const eco = new AgenciaResumen({ id: 'ag-eco', nombre: 'EcoAndes Viajes', ciudad: 'Envigado', planesCount: 5 });
const cafe = new AgenciaResumen({
  id: 'ag-cafe',
  nombre: 'Café y Montaña Tours',
  ciudad: 'Jardín',
  planesCount: 3,
  rating: 5.0,
  reviewsTotal: 3,
});

let catalogo: CatalogoFalso;
beforeEach(() => {
  catalogo = new CatalogoFalso({
    agenciasPublicas: [rutas, eco, cafe],
    planesPorAgencia: { 'ag-rutas': [planDePrueba({ id: 'plan-1' }), planDePrueba({ id: 'plan-2' })] },
  });
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

const ids = (xs: readonly { id: string }[]) => xs.map((x) => x.id);

describe('AgenciasViewModel', () => {
  async function crear() {
    const estados: boolean[] = [];
    let renders = 0;
    const r = await renderHook(() => {
      renders++;
      const vm = useAgenciasViewModel({ catalogo });
      if (estados[estados.length - 1] !== vm.cargando) estados.push(vm.cargando);
      return vm;
    });
    return { ...r, estados, renders: () => renders };
  }

  describe('carga', () => {
    test('antes de cargar: cargando y sin datos', async () => {
      const { result } = await crear();
      expect(result.current.cargando).toBe(true);
      expect(result.current.agencias).toEqual([]);
      expect(result.current.hayAgencias).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.orden).toBe(OrdenAgencias.puntaje);
      expect(catalogo.consultasAgencias).toBe(0);
    });

    test('éxito: agencias, sin error, y notifica cargando → listo', async () => {
      const { result, estados } = await crear();
      await act(() => result.current.cargar());

      expect(result.current.agencias).toHaveLength(3);
      expect(result.current.hayAgencias).toBe(true);
      expect(result.current.cargando).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.errorDetalle).toBeNull();
      expect(estados).toEqual([true, false]);
    });

    test('vacío: sin agencias y sin error (la vista muestra «Aún no hay agencias»)', async () => {
      catalogo.agenciasPublicas = [];
      const { result } = await crear();
      await act(() => result.current.cargar());

      expect(result.current.agencias).toEqual([]);
      expect(result.current.hayAgencias).toBe(false);
      expect(result.current.cargando).toBe(false);
      expect(result.current.error).toBeNull();
    });

    test('error: mensaje para el usuario y detalle técnico, sin agencias', async () => {
      catalogo.fallo = new Error('sin red');
      const { result } = await crear();
      await act(() => result.current.cargar());

      expect(result.current.error).toBe('No pudimos cargar las agencias. Revisa tu conexión e intenta de nuevo.');
      expect(result.current.errorDetalle).toContain('sin red');
      expect(result.current.agencias).toEqual([]);
      expect(result.current.cargando).toBe(false);
    });

    test('reintentar tras un error: limpia el error y muestra las agencias', async () => {
      catalogo.fallo = new Error('sin red');
      const { result } = await crear();
      await act(() => result.current.cargar());
      catalogo.fallo = null;
      await act(() => result.current.cargar());

      expect(result.current.error).toBeNull();
      expect(result.current.errorDetalle).toBeNull();
      expect(result.current.agencias).toHaveLength(3);
    });

    test('una recarga que falla conserva las agencias ya cargadas', async () => {
      const { result } = await crear();
      await act(() => result.current.cargar());
      catalogo.fallo = new Error('sin red');
      await act(() => result.current.cargar());

      expect(result.current.error).not.toBeNull();
      expect(result.current.agencias).toHaveLength(3);
    });

    test('la lista expuesta es de solo lectura', async () => {
      const { result } = await crear();
      await act(() => result.current.cargar());

      expect(() => (result.current.agencias as AgenciaResumen[]).push(eco)).toThrow();
    });
  });

  describe('orden', () => {
    test('por defecto, por puntaje: mayor primero y las «Nueva» al final', async () => {
      const { result } = await crear();
      await act(() => result.current.cargar());
      expect(ids(result.current.agencias)).toEqual(['ag-cafe', 'ag-rutas', 'ag-eco']);
    });

    test('más planes: de más a menos planes', async () => {
      const { result } = await crear();
      await act(() => result.current.cargar());
      await act(() => result.current.cambiarOrden(OrdenAgencias.masPlanes));

      expect(result.current.orden).toBe(OrdenAgencias.masPlanes);
      expect(ids(result.current.agencias)).toEqual(['ag-eco', 'ag-cafe', 'ag-rutas']);
    });

    test('nombre: alfabético sin tildes ni mayúsculas', async () => {
      const { result } = await crear();
      await act(() => result.current.cargar());
      await act(() => result.current.cambiarOrden(OrdenAgencias.nombre));

      expect(ids(result.current.agencias)).toEqual(['ag-cafe', 'ag-eco', 'ag-rutas']);
    });

    test('cambiar el orden notifica y no vuelve a consultar', async () => {
      const { result, renders } = await crear();
      await act(() => result.current.cargar());
      const antes = renders();

      await act(() => result.current.cambiarOrden(OrdenAgencias.nombre));

      expect(renders()).toBe(antes + 1);
      expect(catalogo.consultasAgencias).toBe(1);
    });

    test('elegir el orden que ya está activo no notifica', async () => {
      const { result, renders } = await crear();
      await act(() => result.current.cargar());
      const antes = renders();

      await act(() => result.current.cambiarOrden(OrdenAgencias.puntaje));

      expect(renders()).toBe(antes);
    });

    test('el orden elegido se conserva al recargar', async () => {
      const { result } = await crear();
      await act(() => result.current.cargar());
      await act(() => result.current.cambiarOrden(OrdenAgencias.nombre));
      await act(() => result.current.cargar());

      expect(result.current.orden).toBe(OrdenAgencias.nombre);
      expect(ids(result.current.agencias)).toEqual(['ag-cafe', 'ag-eco', 'ag-rutas']);
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
});

describe('AgenciaViewModel', () => {
  async function crear(agencyId = 'ag-rutas') {
    const estados: boolean[] = [];
    const r = await renderHook(() => {
      const vm = useAgenciaViewModel({ catalogo, agencyId });
      if (estados[estados.length - 1] !== vm.cargando) estados.push(vm.cargando);
      return vm;
    });
    return { ...r, estados };
  }

  test('antes de cargar: cargando y sin datos', async () => {
    const { result } = await crear();
    expect(result.current.cargando).toBe(true);
    expect(result.current.agencia).toBeNull();
    expect(result.current.planes).toEqual([]);
    expect(result.current.noEncontrada).toBe(false);
    expect(result.current.error).toBeNull();
    expect(catalogo.agenciasPedidas).toEqual([]);
  });

  test('éxito: la agencia y sus planes, pedidos por id, y notifica cargando → listo', async () => {
    const { result, estados } = await crear();
    await act(() => result.current.cargar());

    expect(result.current.agencia?.id).toBe('ag-rutas');
    expect(ids(result.current.planes)).toEqual(['plan-1', 'plan-2']);
    expect(result.current.noEncontrada).toBe(false);
    expect(result.current.cargando).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.errorDetalle).toBeNull();
    expect(catalogo.agenciasPedidas).toEqual(['ag-rutas']);
    expect(estados).toEqual([true, false]);
  });

  test('agencia sin planes publicados: existe y la lista está vacía', async () => {
    catalogo.planesPorAgencia.clear();
    const { result } = await crear();
    await act(() => result.current.cargar());

    expect(result.current.agencia).not.toBeNull();
    expect(result.current.planes).toEqual([]);
    expect(result.current.noEncontrada).toBe(false);
  });

  test('agencia que no existe o no está habilitada: noEncontrada, sin error', async () => {
    const { result } = await crear('ag-fantasma');
    await act(() => result.current.cargar());

    expect(result.current.noEncontrada).toBe(true);
    expect(result.current.agencia).toBeNull();
    expect(result.current.planes).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(result.current.cargando).toBe(false);
  });

  test('error: mensaje para el usuario y detalle técnico, sin agencia', async () => {
    catalogo.fallo = new Error('sin red');
    const { result } = await crear();
    await act(() => result.current.cargar());

    expect(result.current.error).toBe('No pudimos cargar la agencia. Revisa tu conexión e intenta de nuevo.');
    expect(result.current.errorDetalle).toContain('sin red');
    expect(result.current.agencia).toBeNull();
    expect(result.current.noEncontrada).toBe(false);
    expect(result.current.cargando).toBe(false);
  });

  test('reintentar tras un error: limpia el error y muestra la agencia', async () => {
    catalogo.fallo = new Error('sin red');
    const { result } = await crear();
    await act(() => result.current.cargar());
    catalogo.fallo = null;
    await act(() => result.current.cargar());

    expect(result.current.error).toBeNull();
    expect(result.current.errorDetalle).toBeNull();
    expect(result.current.agencia?.id).toBe('ag-rutas');
  });

  test('una recarga que falla conserva la agencia ya cargada', async () => {
    const { result } = await crear();
    await act(() => result.current.cargar());
    catalogo.fallo = new Error('sin red');
    await act(() => result.current.cargar());

    expect(result.current.error).not.toBeNull();
    expect(result.current.agencia?.id).toBe('ag-rutas');
    expect(result.current.planes).toHaveLength(2);
  });

  test('la lista de planes expuesta es de solo lectura', async () => {
    const { result } = await crear();
    await act(() => result.current.cargar());

    expect(() => (result.current.planes as Plan[]).push(planDePrueba())).toThrow();
  });

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
