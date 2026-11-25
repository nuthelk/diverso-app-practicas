import { act, renderHook } from '@testing-library/react-native';

import { DiversoError } from '@/core';
import { useReservaViewModel } from '@/features/checkout/view-models/useReservaViewModel';

import { compuerta, esperar } from '../../../support/compuerta';
import { ReservasFalsas, reservaDePrueba } from '../support/reservas-falsas';

/**
 * Carga de `/reserva/:bookingId` por id (confirmación que sobrevive a recargar en web). Sin red
 * ni Supabase. Port 1:1 de `reserva_view_model_test.dart`.
 */

async function crear(reservas: ReservasFalsas, id = 'res-1') {
  const cargandos: boolean[] = [];
  const r = await renderHook(() => {
    const vm = useReservaViewModel({ reservas }, { bookingId: id });
    if (cargandos[cargandos.length - 1] !== vm.cargando) cargandos.push(vm.cargando);
    return vm;
  });
  return { ...r, cargandos };
}

test('arranca cargando, sin reserva ni error', async () => {
  const { result } = await crear(new ReservasFalsas());
  expect(result.current.cargando).toBe(true);
  expect(result.current.reserva).toBeNull();
  expect(result.current.error).toBeNull();
});

test('cargar trae la reserva por id', async () => {
  const reservas = new ReservasFalsas([reservaDePrueba()]);
  const { result, cargandos } = await crear(reservas);
  await act(() => result.current.cargar());

  expect(reservas.consultas).toEqual(['res-1']);
  expect(result.current.reserva?.code).toBe('DIV-AAAA0001');
  expect(result.current.cargando).toBe(false);
  expect(result.current.error).toBeNull();
  expect(cargandos).toEqual([true, false]);
});

test('una reserva inexistente muestra el mensaje del servidor', async () => {
  const { result } = await crear(new ReservasFalsas(), 'nope');
  await act(() => result.current.cargar());
  expect(result.current.error).toBe(new DiversoError('RESERVA_NO_EXISTE').mensajeUsuario);
  expect(result.current.reserva).toBeNull();
  expect(result.current.cargando).toBe(false);
});

test('un error inesperado también llega como mensaje, no como excepción', async () => {
  const reservas = new ReservasFalsas();
  reservas.fallo = new Error('sin red');
  const { result } = await crear(reservas);
  await act(() => result.current.cargar());
  expect(result.current.error).not.toBe('');
  expect(result.current.error).not.toBeNull();
  expect(result.current.reserva).toBeNull();
});

test('cargar de nuevo limpia el error anterior', async () => {
  const reservas = new ReservasFalsas([reservaDePrueba()]);
  reservas.fallo = new Error('sin red');
  const { result } = await crear(reservas);
  await act(() => result.current.cargar());
  reservas.fallo = null;
  await act(() => result.current.cargar());
  expect(result.current.error).toBeNull();
  expect(result.current.reserva).not.toBeNull();
});

test('cargar que termina con la pantalla ya cerrada no avisa a nadie', async () => {
  const reservas = new ReservasFalsas([reservaDePrueba()]);
  reservas.compuerta = compuerta();
  const { result, unmount } = await crear(reservas);
  let cargando!: Promise<void>;
  await act(async () => {
    cargando = result.current.cargar();
    await esperar();
  });

  await unmount();
  reservas.compuerta.completar();
  await cargando;
});
