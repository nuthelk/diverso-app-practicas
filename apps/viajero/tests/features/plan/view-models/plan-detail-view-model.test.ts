import { act, renderHook } from '@testing-library/react-native';

import { Review } from '@/core';
import { MAX_RESENAS, usePlanDetailViewModel } from '@/features/plan/view-models/usePlanDetailViewModel';

import { CatalogoFalso, fechaDePrueba, planDePrueba, ResenasFalsas } from '../../../support/catalogo-falso';
import { compuerta } from '../../../support/compuerta';

/**
 * `usePlanDetailViewModel` con repositorios falsos: carga plan + reseñas (una consulta de cada
 * una), error (también si fallan las reseñas), plan sin fechas, selección de fecha derivada y
 * protección tras desmontar. Port 1:1 de `plan_detail_view_model_test.dart`.
 */

const resena = (id: string) =>
  new Review({ id, bookingId: `b-${id}`, planId: 'plan-1', travelerId: `v-${id}`, rating: 5, createdAt: new Date(2026, 9, 1) });

let catalogo: CatalogoFalso;
let resenas: ResenasFalsas;

beforeEach(() => {
  catalogo = new CatalogoFalso({
    detalles: {
      'plan-1': planDePrueba({
        reviewsCount: 2,
        dates: [fechaDePrueba('f-3', { dias: 9 }), fechaDePrueba('f-1'), fechaDePrueba('f-2', { dias: 5 })],
      }),
    },
  });
  resenas = new ResenasFalsas([resena('r1'), resena('r2')]);
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

async function crear() {
  const estados: boolean[] = [];
  let renders = 0;
  const r = await renderHook(() => {
    renders++;
    const vm = usePlanDetailViewModel({ catalogo, resenas, planId: 'plan-1' });
    if (estados[estados.length - 1] !== vm.cargando) estados.push(vm.cargando);
    return vm;
  });
  return { ...r, estados, renders: () => renders };
}

const ids = (xs: readonly { id: string }[]) => xs.map((x) => x.id);

describe('carga', () => {
  test('antes de cargar: cargando, sin plan ni error', async () => {
    const { result } = await crear();
    expect(result.current.cargando).toBe(true);
    expect(result.current.plan).toBeNull();
    expect(result.current.resenas).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(result.current.fechas).toEqual([]);
    expect(result.current.fechaSeleccionada).toBeNull();
  });

  test('éxito: plan y reseñas con una consulta de cada una, cargando → listo', async () => {
    const { result, estados } = await crear();
    await act(() => result.current.cargar());

    expect(result.current.plan!.id).toBe('plan-1');
    expect(ids(result.current.resenas)).toEqual(['r1', 'r2']);
    expect(result.current.cargando).toBe(false);
    expect(result.current.error).toBeNull();
    expect(catalogo.detallesPedidos).toEqual(['plan-1']);
    expect(resenas.pedidas).toEqual(['plan-1']);
    expect(resenas.limites).toEqual([MAX_RESENAS]);
    expect(MAX_RESENAS).toBe(4);
    expect(estados).toEqual([true, false]);
  });

  test('vacío: plan sin fechas ni reseñas', async () => {
    catalogo.detalles.set('plan-1', planDePrueba());
    resenas.resenas = [];
    const { result } = await crear();
    await act(() => result.current.cargar());

    expect(result.current.plan).not.toBeNull();
    expect(result.current.resenas).toEqual([]);
    expect(result.current.fechas).toEqual([]);
    expect(result.current.fechaSeleccionada).toBeNull();
    expect(result.current.error).toBeNull();
  });

  test('error al cargar el plan: mensaje para el usuario y sin plan', async () => {
    catalogo.fallo = new Error('sin red');
    const { result } = await crear();
    await act(() => result.current.cargar());

    expect(result.current.error).toBe('Revisa tu conexión e intenta de nuevo.');
    expect(result.current.plan).toBeNull();
    expect(result.current.cargando).toBe(false);
  });

  test('error al cargar las reseñas: toda la ficha falla, como antes', async () => {
    resenas.fallo = new Error('sin red');
    const { result } = await crear();
    await act(() => result.current.cargar());

    expect(result.current.error).not.toBeNull();
    expect(result.current.plan).toBeNull();
  });

  test('reintentar tras un error carga el plan y limpia el error', async () => {
    catalogo.fallo = new Error('sin red');
    const { result } = await crear();
    await act(() => result.current.cargar());
    catalogo.fallo = null;
    await act(() => result.current.cargar());

    expect(result.current.error).toBeNull();
    expect(result.current.plan!.id).toBe('plan-1');
  });
});

describe('fecha seleccionada', () => {
  test('por defecto la más cercana; fechas de la más próxima a la más lejana', async () => {
    const { result } = await crear();
    await act(() => result.current.cargar());

    expect(ids(result.current.fechas)).toEqual(['f-1', 'f-2', 'f-3']);
    expect(result.current.fechaSeleccionada!.id).toBe('f-1');
  });

  test('seleccionarFecha cambia la selección y notifica', async () => {
    const { result, renders } = await crear();
    await act(() => result.current.cargar());
    const antes = renders();

    await act(() => result.current.seleccionarFecha(result.current.fechas[2]!));

    expect(result.current.fechaSeleccionada!.id).toBe('f-3');
    expect(renders()).toBe(antes + 1);
  });

  test('leer la selección no la modifica ni notifica (nada se muta al leer)', async () => {
    const { result, renders } = await crear();
    await act(() => result.current.cargar());
    await act(() => result.current.seleccionarFecha(result.current.fechas[1]!));
    const antes = renders();

    for (let i = 0; i < 3; i++) {
      expect(result.current.fechaSeleccionada!.id).toBe('f-2');
      expect(result.current.fechas).toHaveLength(3);
    }

    expect(renders()).toBe(antes);
  });

  test('una fecha que no está entre las disponibles se ignora', async () => {
    const { result } = await crear();
    await act(() => result.current.cargar());
    await act(() => result.current.seleccionarFecha(result.current.fechas[1]!));

    await act(() => result.current.seleccionarFecha(fechaDePrueba('otra')));

    expect(result.current.fechaSeleccionada!.id).toBe('f-2');
  });

  test('al recargar la selección vuelve a la primera fecha', async () => {
    const { result } = await crear();
    await act(() => result.current.cargar());
    await act(() => result.current.seleccionarFecha(result.current.fechas[2]!));

    await act(() => result.current.cargar());

    expect(result.current.fechaSeleccionada!.id).toBe('f-1');
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
