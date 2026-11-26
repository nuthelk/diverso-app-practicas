import { act, renderHook } from '@testing-library/react-native';

import {
  Booking,
  BookingStatus,
  DiversoError,
  RefundStatus,
  CancellationResult,
  type BookingRepository,
  type Public,
} from '@/core';
import { useBookingsViewModel } from '@/features/bookings/view-models/useBookingsViewModel';

import { createGate } from '../../../support/gate';
import { stub } from '../../../support/test-dependencies';
import { FakeBookingRepository, testBooking } from '../../../support/fake-booking-repository';

/**
 * Caso real de L22: el 25-oct-2026 «Próximas» mostraba viajes del 3, 6, 12 y 18 de octubre
 * (ya salieron) y sin orden. Reloj fijo; sin red ni Supabase. Port 1:1 de
 * `bookings_view_model_test.dart`.
 */
const now = new Date(Date.UTC(2026, 9, 25, 15, 0));
const clock = () => now;
const day = (d: number) => new Date(Date.UTC(2026, 9, d, 13));
const minutesFromNow = (m: number) => new Date(now.getTime() + m * 60 * 1000);

function bookingAt(code: string, departure: Date, status: BookingStatus = BookingStatus.confirmed) {
  return new Booking({
    id: code,
    code,
    planDateId: 'pd',
    travelerId: 'v',
    pax: 2,
    totalAmount: 190000,
    status,
    createdAt: day(1),
    departureAt: departure,
  });
}

async function setup(repo: Public<BookingRepository>) {
  const loadingStates: boolean[] = [];
  const r = await renderHook(() => {
    const vm = useBookingsViewModel({ bookings: repo, clock });
    if (loadingStates[loadingStates.length - 1] !== vm.loading) loadingStates.push(vm.loading);
    return vm;
  });
  return { ...r, loadingStates };
}

async function loaded(list: Booking[]) {
  const r = await setup(stub<Public<BookingRepository>>('BookingRepository', { myBookings: async () => list }));
  await act(() => r.result.current.load());
  return r.result;
}

const codes = (l: readonly Booking[]) => l.map((b) => b.code);

test('L22: confirmadas del 3, 6, 12, 18 y 27 → solo el 27 es próximo; el resto, historial reciente primero', async () => {
  const c = await loaded([
    bookingAt('D27', day(27)),
    bookingAt('D18', day(18)),
    bookingAt('D03', day(3)),
    bookingAt('D06', day(6)),
    bookingAt('D12', day(12)),
  ]);

  expect(codes(c.current.upcoming)).toEqual(['D27']);
  expect(codes(c.current.history)).toEqual(['D18', 'D12', 'D06', 'D03']);
});

test('próximas: pendiente y confirmada con salida futura, la más cercana primero', async () => {
  const c = await loaded([
    bookingAt('D30', day(30), BookingStatus.pendingPayment),
    bookingAt('D28', day(28)),
    bookingAt('D26', day(26)),
  ]);

  expect(codes(c.current.upcoming)).toEqual(['D26', 'D28', 'D30']);
  expect(c.current.history).toEqual([]);
});

test('historial: canceladas y completadas (aunque su fecha sea futura) y pendientes ya vencidas por salida', async () => {
  const c = await loaded([
    bookingAt('CAN-FUT', day(29), BookingStatus.cancelled),
    bookingAt('COMP', day(10), BookingStatus.completed),
    bookingAt('PEND-PASADA', day(20), BookingStatus.pendingPayment),
    bookingAt('PROX', day(27)),
  ]);

  expect(codes(c.current.upcoming)).toEqual(['PROX']);
  expect(codes(c.current.history)).toEqual(['CAN-FUT', 'PEND-PASADA', 'COMP']);
});

test('límite: salida 1 minuto adelante es próxima y 1 minuto atrás es historial', async () => {
  const c = await loaded([bookingAt('ADELANTE', minutesFromNow(1)), bookingAt('ATRAS', minutesFromNow(-1))]);

  expect(codes(c.current.upcoming)).toEqual(['ADELANTE']);
  expect(codes(c.current.history)).toEqual(['ATRAS']);
});

test('historial: las que no tienen salida van al final', async () => {
  const noDeparture = new Booking({ ...bookingAt('SIN', day(1), BookingStatus.cancelled), departureAt: null });
  const c = await loaded([noDeparture, bookingAt('D10', day(10)), bookingAt('D12', day(12))]);

  expect(codes(c.current.history)).toEqual(['D12', 'D10', 'SIN']);
});

test('PRESERVE: una lista vacía deja ambas pestañas vacías y cargar termina sin error', async () => {
  const c = await loaded([]);
  expect(c.current.upcoming).toEqual([]);
  expect(c.current.history).toEqual([]);
  expect(c.current.loading).toBe(false);
  expect(c.current.error).toBeNull();
});

describe('estados de la carga', () => {
  let repo: FakeBookingRepository;
  beforeEach(() => {
    repo = new FakeBookingRepository([testBooking()]);
  });

  test('antes de cargar: cargando, sin reservas ni error ni mensaje', async () => {
    const { result } = await setup(repo);
    expect(result.current.loading).toBe(true);
    expect(result.current.bookings).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(result.current.message).toBeNull();
  });

  test('éxito: cargando → listo con las reservas, una consulta', async () => {
    const { result, loadingStates } = await setup(repo);

    await act(() => result.current.load());

    expect(loadingStates).toEqual([true, false]);
    expect(result.current.bookings.map((b) => b.id)).toEqual(['res-1']);
    expect(result.current.error).toBeNull();
    expect(repo.listQueries).toBe(1);
  });

  test('error: avisa «No pudimos cargar tus reservas.», sin reservas, y reintentar lo limpia', async () => {
    const { result } = await setup(repo);
    repo.failure = new Error('sin red');
    await act(() => result.current.load());

    expect(result.current.error).toBe('No pudimos cargar tus reservas.');
    expect(result.current.loading).toBe(false);
    expect(result.current.bookings).toEqual([]);

    repo.failure = null;
    await act(() => result.current.load());

    expect(result.current.error).toBeNull();
    expect(result.current.bookings).toHaveLength(1);
  });

  test('vacío: sin reservas no hay error y ambas listas quedan vacías', async () => {
    const { result } = await setup(repo);
    repo.list = [];
    await act(() => result.current.load());

    expect(result.current.bookings).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(result.current.upcoming).toEqual([]);
    expect(result.current.history).toEqual([]);
  });

  test('el estado no se puede modificar desde fuera', async () => {
    const { result } = await setup(repo);
    await act(() => result.current.load());
    expect(() => (result.current.bookings as Booking[]).push(testBooking({ id: 'x' }))).toThrow(TypeError);
  });

  test('refresh no pasa por «cargando»: la lista sigue a la vista hasta que llega la nueva', async () => {
    const { result, loadingStates } = await setup(repo);
    await act(() => result.current.load());
    expect(loadingStates).toEqual([true, false]);

    repo.gate = createGate();
    repo.list = [testBooking(), testBooking({ id: 'res-2' })];
    let pendingRefresh!: Promise<void>;
    await act(async () => {
      pendingRefresh = result.current.refresh();
    });

    // Mientras llega: la lista vieja, sin esqueleto (la vista no la desmonta y no pierde el scroll).
    expect(result.current.loading).toBe(false);
    expect(result.current.bookings.map((b) => b.id)).toEqual(['res-1']);

    await act(async () => {
      repo.gate!.resolve();
      await pendingRefresh;
    });

    expect(loadingStates).toEqual([true, false]);
    expect(result.current.bookings.map((b) => b.id)).toEqual(['res-1', 'res-2']);
    expect(repo.listQueries).toBe(2);
  });

  test('refresh que falla avisa igual que load', async () => {
    const { result } = await setup(repo);
    await act(() => result.current.load());
    repo.failure = new Error('sin red');

    await act(() => result.current.refresh());

    expect(result.current.error).toBe('No pudimos cargar tus reservas.');
    expect(result.current.loading).toBe(false);
  });

  test('desmontada: una carga que termina después no avisa a nadie ni lanza', async () => {
    repo.gate = createGate();
    const { result, unmount } = await setup(repo);
    let pendingLoad!: Promise<void>;
    await act(async () => {
      pendingLoad = result.current.load();
    });
    await unmount();
    repo.gate.resolve();

    await expect(pendingLoad).resolves.toBeUndefined();
  });
});

describe('mensaje y cancelación', () => {
  let repo: FakeBookingRepository;
  const oneBooking = testBooking({ departure: day(27) });

  async function ready() {
    repo = new FakeBookingRepository([oneBooking]);
    const r = await setup(repo);
    await act(() => r.result.current.load());
    return r.result;
  }

  test('notify deja el texto en `message`; clearMessage lo consume', async () => {
    const vm = await ready();

    await act(async () => vm.current.notify('Cerraste el pago'));
    expect(vm.current.message).toBe('Cerraste el pago');

    // En Flutter consumir el aviso no notifica (el oyente lo volvería a mostrar). Aquí la vista
    // lo muestra desde un efecto sobre el texto: volver a null no lo muestra de nuevo.
    await act(async () => vm.current.clearMessage());
    expect(vm.current.message).toBeNull();
  });

  test('cancellationPreview devuelve el reembolso y no deja mensaje', async () => {
    const vm = await ready();
    let preview: Awaited<ReturnType<typeof vm.current.cancellationPreview>> = null;
    await act(async () => {
      preview = await vm.current.cancellationPreview(oneBooking);
    });
    expect(preview).not.toBeNull();
    expect(preview!.percentage).toBe(100);
    expect(vm.current.message).toBeNull();
  });

  test('cancellationPreview que falla devuelve null y explica el motivo en `message`', async () => {
    const vm = await ready();
    repo.cancelFailure = new DiversoError('RESERVA_YA_SALIO');

    let preview: unknown = 'sin llamar';
    await act(async () => {
      preview = await vm.current.cancellationPreview(oneBooking);
    });
    expect(preview).toBeNull();
    expect(vm.current.message).toBe('Este viaje ya salió, así que la reserva ya no se puede pagar ni cancelar.');
  });

  test('cancel: avisa con el reembolso y recarga la lista', async () => {
    const vm = await ready();
    let ok = false;
    await act(async () => {
      ok = await vm.current.cancel(oneBooking);
    });

    expect(ok).toBe(true);
    expect(repo.cancelledIds).toEqual(['res-1']);
    expect(vm.current.message).toBe(
      'Reserva cancelada y cupos liberados. Reembolso de prueba aprobado: $ 190.000 (100 %).',
    );
    expect(repo.listQueries).toBe(2); // una al abrir y otra tras cancelar
  });

  test('cancelar sin reembolso solo dice «Sin reembolso»', async () => {
    const vm = await ready();
    repo.result = new CancellationResult({
      applies: false,
      percentage: 0,
      amount: 0,
      status: RefundStatus.notApplicable,
      reason: '',
    });

    await act(async () => {
      await vm.current.cancel(oneBooking);
    });

    expect(vm.current.message).toBe('Reserva cancelada y cupos liberados. Sin reembolso.');
  });

  test('cancelar que el servidor rechaza: explica el motivo y no recarga', async () => {
    const vm = await ready();
    repo.cancelFailure = new DiversoError('ESTADO_INVALIDO');

    let ok = true;
    await act(async () => {
      ok = await vm.current.cancel(oneBooking);
    });

    expect(ok).toBe(false);
    expect(vm.current.message).toBe('La reserva ya no admite esta operación.');
    expect(repo.cancelledIds).toEqual([]);
    expect(repo.listQueries).toBe(1);
  });

  test('un error inesperado al cancelar también se explica, no se pierde', async () => {
    const vm = await ready();
    repo.cancelFailure = new Error('boom');

    let ok = true;
    await act(async () => {
      ok = await vm.current.cancel(oneBooking);
    });
    expect(ok).toBe(false);
    expect(vm.current.message).not.toBeNull();
  });

  test('canCancel / canReview siguen las reglas de Próximas e Historial', async () => {
    const vm = await ready();
    const upcoming = testBooking({ departure: day(27) });
    const past = testBooking({ departure: day(10) });
    const cancelled = testBooking({ departure: day(27), status: BookingStatus.cancelled });

    expect(vm.current.canCancel(upcoming)).toBe(true);
    expect(vm.current.canReview(upcoming)).toBe(false);
    expect(vm.current.canCancel(past)).toBe(false);
    expect(vm.current.canReview(past)).toBe(true);
    expect(vm.current.canCancel(cancelled)).toBe(false);
    expect(vm.current.canReview(testBooking({ departure: day(10), hasReview: true }))).toBe(false);
  });

  test('las reglas del reloj se recalculan en cada lectura (no se cachean)', async () => {
    let moment = new Date(Date.UTC(2026, 9, 26, 12));
    repo = new FakeBookingRepository([testBooking({ departure: day(27) })]);
    const { result } = await renderHook(() => useBookingsViewModel({ bookings: repo, clock: () => moment }));
    await act(() => result.current.load());
    expect(result.current.upcoming).toHaveLength(1);

    moment = new Date(Date.UTC(2026, 9, 28, 12));
    expect(result.current.canCancel(repo.list[0]!)).toBe(false);
    expect(result.current.canReview(repo.list[0]!)).toBe(true);
  });
});
