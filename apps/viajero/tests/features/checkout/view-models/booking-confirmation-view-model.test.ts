import { act, renderHook } from '@testing-library/react-native';

import { DiversoError } from '@/core';
import { useBookingConfirmationViewModel } from '@/features/checkout/view-models/useBookingConfirmationViewModel';

import { createGate, flushMicrotasks } from '../../../support/gate';
import { FakeBookings, testBooking } from '../support/fake-bookings';

/**
 * Carga de `/reserva/:bookingId` por id (confirmación que sobrevive a recargar en web). Sin red
 * ni Supabase. Port 1:1 de `reserva_view_model_test.dart`.
 */

async function setup(bookings: FakeBookings, id = 'res-1') {
  const loadingStates: boolean[] = [];
  const r = await renderHook(() => {
    const vm = useBookingConfirmationViewModel({ bookings }, { bookingId: id });
    if (loadingStates[loadingStates.length - 1] !== vm.loading) loadingStates.push(vm.loading);
    return vm;
  });
  return { ...r, loadingStates };
}

test('arranca cargando, sin reserva ni error', async () => {
  const { result } = await setup(new FakeBookings());
  expect(result.current.loading).toBe(true);
  expect(result.current.booking).toBeNull();
  expect(result.current.error).toBeNull();
});

test('cargar trae la reserva por id', async () => {
  const bookings = new FakeBookings([testBooking()]);
  const { result, loadingStates } = await setup(bookings);
  await act(() => result.current.load());

  expect(bookings.bookingQueries).toEqual(['res-1']);
  expect(result.current.booking?.code).toBe('DIV-AAAA0001');
  expect(result.current.loading).toBe(false);
  expect(result.current.error).toBeNull();
  expect(loadingStates).toEqual([true, false]);
});

test('una reserva inexistente muestra el mensaje del servidor', async () => {
  const { result } = await setup(new FakeBookings(), 'nope');
  await act(() => result.current.load());
  expect(result.current.error).toBe(new DiversoError('RESERVA_NO_EXISTE').userMessage);
  expect(result.current.booking).toBeNull();
  expect(result.current.loading).toBe(false);
});

test('un error inesperado también llega como mensaje, no como excepción', async () => {
  const bookings = new FakeBookings();
  bookings.failure = new Error('sin red');
  const { result } = await setup(bookings);
  await act(() => result.current.load());
  expect(result.current.error).not.toBe('');
  expect(result.current.error).not.toBeNull();
  expect(result.current.booking).toBeNull();
});

test('cargar de nuevo limpia el error anterior', async () => {
  const bookings = new FakeBookings([testBooking()]);
  bookings.failure = new Error('sin red');
  const { result } = await setup(bookings);
  await act(() => result.current.load());
  bookings.failure = null;
  await act(() => result.current.load());
  expect(result.current.error).toBeNull();
  expect(result.current.booking).not.toBeNull();
});

test('cargar que termina con la pantalla ya cerrada no avisa a nadie', async () => {
  const bookings = new FakeBookings([testBooking()]);
  bookings.gate = createGate();
  const { result, unmount } = await setup(bookings);
  let pendingLoad!: Promise<void>;
  await act(async () => {
    pendingLoad = result.current.load();
    await flushMicrotasks();
  });

  await unmount();
  bookings.gate.resolve();
  await pendingLoad;
});
