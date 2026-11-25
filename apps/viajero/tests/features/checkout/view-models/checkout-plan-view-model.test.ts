import { act, renderHook } from '@testing-library/react-native';

import { DiversoError } from '@/core';
import { useCheckoutPlanViewModel } from '@/features/checkout/view-models/useCheckoutPlanViewModel';

import { compuerta, esperar } from '../../../support/compuerta';
import { CatalogoFalso, fechaDePrueba, planDePrueba } from '../support/catalogo-falso';

/**
 * Carga del plan y la fecha de `/checkout/:planId/:fechaId` por id (sin `state.extra`). Sin red
 * ni Supabase. Port 1:1 de `checkout_plan_view_model_test.dart` (+ reloj inyectable).
 */

async function crear(catalogo: CatalogoFalso, { fechaId = 'fecha-1', reloj }: { fechaId?: string; reloj?: () => Date } = {}) {
  const cargandos: boolean[] = [];
  const r = await renderHook(() => {
    const vm = useCheckoutPlanViewModel({ catalogo }, { planId: 'plan-1', fechaId, reloj });
    if (cargandos[cargandos.length - 1] !== vm.cargando) cargandos.push(vm.cargando);
    return vm;
  });
  return { ...r, cargandos };
}

test('arranca cargando, sin plan ni error', async () => {
  const { result } = await crear(new CatalogoFalso());
  expect(result.current.cargando).toBe(true);
  expect(result.current.plan).toBeNull();
  expect(result.current.fecha).toBeNull();
  expect(result.current.error).toBeNull();
});

test('cargar trae el plan por id y elige la fecha pedida', async () => {
  const catalogo = new CatalogoFalso({ detalles: { 'plan-1': planDePrueba() } });
  const { result, cargandos } = await crear(catalogo);
  await act(() => result.current.cargar());

  expect(catalogo.detallesPedidos).toEqual(['plan-1']);
  expect(result.current.plan?.titulo).toBe('Guatapé en un día');
  expect(result.current.fecha?.id).toBe('fecha-1');
  expect(result.current.cargando).toBe(false);
  expect(result.current.error).toBeNull();
  expect(cargandos).toEqual([true, false]);
});

test('una fecha que no es del plan no está disponible (y no es un error)', async () => {
  const { result } = await crear(new CatalogoFalso({ detalles: { 'plan-1': planDePrueba() } }), { fechaId: 'otra' });
  await act(() => result.current.cargar());
  expect(result.current.plan).not.toBeNull();
  expect(result.current.fecha).toBeNull();
  expect(result.current.error).toBeNull();
});

test('una fecha que ya salió no está disponible', async () => {
  const plan = planDePrueba({ fechas: [fechaDePrueba('fecha-1', { dias: -2 })] });
  const { result } = await crear(new CatalogoFalso({ detalles: { 'plan-1': plan } }));
  await act(() => result.current.cargar());
  expect(result.current.plan).not.toBeNull();
  expect(result.current.fecha).toBeNull();
});

test('si la carga falla: mensaje para el usuario y sin plan', async () => {
  const catalogo = new CatalogoFalso();
  catalogo.fallo = new DiversoError('PLAN_NO_PUBLICADO');
  const { result } = await crear(catalogo);
  await act(() => result.current.cargar());
  expect(result.current.error).toBe('Revisa tu conexión e intenta de nuevo.');
  expect(result.current.plan).toBeNull();
  expect(result.current.cargando).toBe(false);
});

test('«Reintentar» tras un fallo vuelve a cargar y limpia el error', async () => {
  const catalogo = new CatalogoFalso({ detalles: { 'plan-1': planDePrueba() } });
  catalogo.fallo = new Error('sin red');
  const { result } = await crear(catalogo);
  await act(() => result.current.cargar());
  expect(result.current.error).not.toBeNull();

  catalogo.fallo = null;
  await act(() => result.current.cargar());
  expect(result.current.error).toBeNull();
  expect(result.current.fecha?.id).toBe('fecha-1');
  expect(catalogo.detallesPedidos).toEqual(['plan-1', 'plan-1']);
});

test('cargar que termina con la pantalla ya cerrada no avisa a nadie', async () => {
  const catalogo = new CatalogoFalso({ detalles: { 'plan-1': planDePrueba() } });
  catalogo.compuerta = compuerta();
  const { result, unmount } = await crear(catalogo);
  let cargando!: Promise<void>;
  await act(async () => {
    cargando = result.current.cargar();
    await esperar();
  });

  await unmount();
  catalogo.compuerta.completar();
  await cargando;
});

test('la fecha se recalcula con el reloj en cada lectura (gotcha 10): la salida que ya partió deja de estar', async () => {
  const fecha = fechaDePrueba('fecha-1', { dias: 1 });
  let ahora = new Date();
  const { result, rerender } = await crear(new CatalogoFalso({ detalles: { 'plan-1': planDePrueba({ fechas: [fecha] }) } }), {
    reloj: () => ahora,
  });
  await act(() => result.current.cargar());
  expect(result.current.fecha?.id).toBe('fecha-1');

  ahora = new Date(Date.now() + 3 * 24 * 3600 * 1000);
  await rerender({});
  expect(result.current.fecha).toBeNull();
});
