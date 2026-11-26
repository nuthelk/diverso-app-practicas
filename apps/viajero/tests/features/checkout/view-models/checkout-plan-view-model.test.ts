import { act, renderHook } from '@testing-library/react-native';

import { DiversoError } from '@/core';
import { useCheckoutPlanViewModel } from '@/features/checkout/view-models/useCheckoutPlanViewModel';

import { compuerta, esperar } from '../../../support/compuerta';
import { FakeCatalog, testPlanDate, testPlan } from '../support/fake-catalog';

/**
 * Carga del plan y la fecha de `/checkout/:planId/:fechaId` por id (sin `state.extra`). Sin red
 * ni Supabase. Port 1:1 de `checkout_plan_view_model_test.dart` (+ reloj inyectable).
 */

async function setup(catalog: FakeCatalog, { dateId = 'fecha-1', clock }: { dateId?: string; clock?: () => Date } = {}) {
  const loadingStates: boolean[] = [];
  const r = await renderHook(() => {
    const vm = useCheckoutPlanViewModel({ catalog }, { planId: 'plan-1', dateId, clock });
    if (loadingStates[loadingStates.length - 1] !== vm.loading) loadingStates.push(vm.loading);
    return vm;
  });
  return { ...r, loadingStates };
}

test('arranca cargando, sin plan ni error', async () => {
  const { result } = await setup(new FakeCatalog());
  expect(result.current.loading).toBe(true);
  expect(result.current.plan).toBeNull();
  expect(result.current.planDate).toBeNull();
  expect(result.current.error).toBeNull();
});

test('cargar trae el plan por id y elige la fecha pedida', async () => {
  const catalog = new FakeCatalog({ details: { 'plan-1': testPlan() } });
  const { result, loadingStates } = await setup(catalog);
  await act(() => result.current.load());

  expect(catalog.requestedPlanIds).toEqual(['plan-1']);
  expect(result.current.plan?.title).toBe('Guatapé en un día');
  expect(result.current.planDate?.id).toBe('fecha-1');
  expect(result.current.loading).toBe(false);
  expect(result.current.error).toBeNull();
  expect(loadingStates).toEqual([true, false]);
});

test('una fecha que no es del plan no está disponible (y no es un error)', async () => {
  const { result } = await setup(new FakeCatalog({ details: { 'plan-1': testPlan() } }), { dateId: 'otra' });
  await act(() => result.current.load());
  expect(result.current.plan).not.toBeNull();
  expect(result.current.planDate).toBeNull();
  expect(result.current.error).toBeNull();
});

test('una fecha que ya salió no está disponible', async () => {
  const plan = testPlan({ dates: [testPlanDate('fecha-1', { days: -2 })] });
  const { result } = await setup(new FakeCatalog({ details: { 'plan-1': plan } }));
  await act(() => result.current.load());
  expect(result.current.plan).not.toBeNull();
  expect(result.current.planDate).toBeNull();
});

test('si la carga falla: mensaje para el usuario y sin plan', async () => {
  const catalog = new FakeCatalog();
  catalog.failure = new DiversoError('PLAN_NO_PUBLICADO');
  const { result } = await setup(catalog);
  await act(() => result.current.load());
  expect(result.current.error).toBe('Revisa tu conexión e intenta de nuevo.');
  expect(result.current.plan).toBeNull();
  expect(result.current.loading).toBe(false);
});

test('«Reintentar» tras un fallo vuelve a cargar y limpia el error', async () => {
  const catalog = new FakeCatalog({ details: { 'plan-1': testPlan() } });
  catalog.failure = new Error('sin red');
  const { result } = await setup(catalog);
  await act(() => result.current.load());
  expect(result.current.error).not.toBeNull();

  catalog.failure = null;
  await act(() => result.current.load());
  expect(result.current.error).toBeNull();
  expect(result.current.planDate?.id).toBe('fecha-1');
  expect(catalog.requestedPlanIds).toEqual(['plan-1', 'plan-1']);
});

test('cargar que termina con la pantalla ya cerrada no avisa a nadie', async () => {
  const catalog = new FakeCatalog({ details: { 'plan-1': testPlan() } });
  catalog.gate = compuerta();
  const { result, unmount } = await setup(catalog);
  let pendingLoad!: Promise<void>;
  await act(async () => {
    pendingLoad = result.current.load();
    await esperar();
  });

  await unmount();
  catalog.gate.completar();
  await pendingLoad;
});

test('la fecha se recalcula con el reloj en cada lectura (gotcha 10): la salida que ya partió deja de estar', async () => {
  const planDate = testPlanDate('fecha-1', { days: 1 });
  let now = new Date();
  const { result, rerender } = await setup(new FakeCatalog({ details: { 'plan-1': testPlan({ dates: [planDate] }) } }), {
    clock: () => now,
  });
  await act(() => result.current.load());
  expect(result.current.planDate?.id).toBe('fecha-1');

  now = new Date(Date.now() + 3 * 24 * 3600 * 1000);
  await rerender({});
  expect(result.current.planDate).toBeNull();
});
