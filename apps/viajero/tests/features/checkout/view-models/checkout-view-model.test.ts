import { act, renderHook } from '@testing-library/react-native';

import { DiversoError } from '@/core';
import { PaymentOutcome } from '@/features/checkout/payment-outcome';
import { useCheckoutViewModel } from '@/features/checkout/view-models/useCheckoutViewModel';

import { createGate, flushMicrotasks } from '../../../support/gate';
import { testPlanDate, testPlan } from '../support/fake-catalog';
import { testPendingBooking, FakeBookings } from '../support/fake-bookings';

/**
 * Estado, comandos y guarda de desmontaje de `useCheckoutViewModel`. Las reglas de la reserva
 * pendiente están en `checkout-pendiente.test.tsx`. Sin red ni Supabase. Port 1:1 de
 * `checkout_view_model_test.dart` (+ la vibración al pagar).
 */

const planDate = testPlanDate();
const plan = testPlan({ dates: [planDate] });

let bookings: FakeBookings;
let opened: string[];
let vibrations: number;

beforeEach(() => {
  bookings = new FakeBookings();
  opened = [];
  vibrations = 0;
});

const fakeOpenPayment = (completed: boolean) => async (id: string) => {
  opened.push(id);
  return completed ? PaymentOutcome.completed : PaymentOutcome.closed;
};

async function setup() {
  const processingStates: boolean[] = [];
  const r = await renderHook(() => {
    const vm = useCheckoutViewModel({ bookings }, { vibrate: () => vibrations++ });
    if (processingStates[processingStates.length - 1] !== vm.processing) processingStates.push(vm.processing);
    return vm;
  });
  return { ...r, processingStates };
}

test('estado inicial: una persona, sin reserva, sin error ni proceso en curso', async () => {
  const { result } = await setup();
  expect(result.current.pax).toBe(1);
  expect(result.current.bookingId).toBeNull();
  expect(result.current.pending).toBeNull();
  expect(result.current.error).toBeNull();
  expect(result.current.processing).toBe(false);
  expect(result.current.total(plan)).toBe(150000);
});

test('las personas van de 1 a 20 y el total las multiplica', async () => {
  const { result } = await setup();
  await act(() => result.current.setPax(0));
  expect(result.current.pax).toBe(1);
  await act(() => result.current.setPax(99));
  expect(result.current.pax).toBe(20);
  await act(() => result.current.setPax(3));
  expect(result.current.total(plan)).toBe(450000);
});

test('pagar avisa dos veces: empieza a procesar y termina (y vibra)', async () => {
  const { result, processingStates } = await setup();
  const gate = createGate();
  let paying!: Promise<void>;
  await act(async () => {
    paying = result.current.pay(planDate, async (id) => {
      await gate.promise;
      return fakeOpenPayment(true)(id);
    });
    await flushMicrotasks();
  });
  expect(result.current.processing).toBe(true);
  gate.resolve();
  await act(() => paying);

  expect(processingStates).toEqual([false, true, false]);
  expect(bookings.createdBookings).toEqual([{ planDateId: 'fecha-1', pax: 1 }]);
  expect(opened).toEqual(['nueva-1']);
  expect(result.current.bookingId).toBe('nueva-1');
  expect(result.current.error).toBeNull();
  expect(vibrations).toBe(1);
});

test('cerrar el pago sin terminar deja el aviso y conserva la reserva para reintentar', async () => {
  const { result } = await setup();
  await act(() => result.current.pay(planDate, fakeOpenPayment(false)));
  expect(result.current.error).toContain('Cerraste el pago antes de terminar');
  expect(result.current.error).toContain('Ya pagué, verificar');
  expect(result.current.bookingId).toBe('nueva-1');
  expect(result.current.processing).toBe(false);
});

test('bug F: en web el pago queda redirigido y «Procesando…» termina, sin error', async () => {
  const { result } = await setup();
  await act(() =>
    result.current.pay(planDate, async (id) => {
      opened.push(id);
      return PaymentOutcome.redirected;
    }),
  );
  expect(result.current.processing).toBe(false);
  expect(result.current.error).toBeNull();
  // La reserva sigue lista para «Ya pagué, verificar».
  expect(result.current.bookingId).toBe('nueva-1');
  expect(opened).toEqual(['nueva-1']);
});

test('web: tras redirigir a Wompi el botón de pagar sigue bloqueado hasta que la página se descarga', async () => {
  const { result } = await setup();
  expect(result.current.canPay).toBe(true);
  await act(() => result.current.pay(planDate, async () => PaymentOutcome.redirected));
  expect(result.current.canPay).toBe(false);
  expect(result.current.processing).toBe(false);
});

test('web: un segundo toque tras redirigir no abre otro pago ni crea otra reserva', async () => {
  const { result } = await setup();
  await act(() =>
    result.current.pay(planDate, async (id) => {
      opened.push(id);
      return PaymentOutcome.redirected;
    }),
  );
  await act(() => result.current.pay(planDate, fakeOpenPayment(true)));
  expect(opened).toEqual(['nueva-1']);
  expect(bookings.createdBookings).toHaveLength(1);
});

test('web: completar la reserva pendiente y ser redirigido también bloquea pagar', async () => {
  bookings.pending = testPendingBooking({ pax: 2 });
  const { result } = await setup();
  await act(() => result.current.loadPending(planDate));
  await act(() => result.current.completePending(async () => PaymentOutcome.redirected));
  expect(result.current.canPay).toBe(false);
  expect(result.current.processing).toBe(false);
});

test('cerrar el pago (móvil) deja pagar de nuevo: solo la redirección bloquea', async () => {
  const { result } = await setup();
  await act(() => result.current.pay(planDate, fakeOpenPayment(false)));
  expect(result.current.canPay).toBe(true);
});

test('un error del servidor se muestra con su mensaje en español', async () => {
  bookings.createFailure = new DiversoError('SIN_CUPO');
  const { result } = await setup();
  await act(() => result.current.pay(planDate, fakeOpenPayment(true)));
  expect(result.current.error).toBe(new DiversoError('SIN_CUPO').userMessage);
  expect(result.current.bookingId).toBeNull();
  expect(result.current.processing).toBe(false);
});

test('un error del servidor al abrir el pago se muestra y no pierde la reserva', async () => {
  const { result } = await setup();
  await act(() =>
    result.current.pay(planDate, async () => {
      throw new DiversoError('RESERVA_VENCIDA');
    }),
  );
  expect(result.current.error).toBe(new DiversoError('RESERVA_VENCIDA').userMessage);
  expect(result.current.bookingId).toBe('nueva-1');
});

test('un error inesperado no se traga: mensaje genérico y el checkout sigue usable', async () => {
  bookings.pendingLookupFailure = new Error('boom');
  const { result } = await setup();
  await act(() => result.current.pay(planDate, fakeOpenPayment(true)));
  expect(result.current.error).toBe('No pudimos iniciar el pago. Intenta de nuevo.');
  expect(result.current.processing).toBe(false);
  expect(opened).toEqual([]);
});

test('un nuevo intento limpia el error anterior', async () => {
  bookings.pendingLookupFailure = new Error('boom');
  const { result } = await setup();
  await act(() => result.current.pay(planDate, fakeOpenPayment(true)));
  bookings.pendingLookupFailure = null;
  await act(() => result.current.pay(planDate, fakeOpenPayment(true)));
  expect(result.current.error).toBeNull();
});

describe('guarda de desmontaje', () => {
  test('pagar que termina cuando la pantalla ya se cerró no avisa a nadie', async () => {
    const { result, unmount } = await setup();
    const gate = createGate<PaymentOutcome>();
    let paying!: Promise<void>;
    await act(async () => {
      paying = result.current.pay(planDate, () => gate.promise);
      await flushMicrotasks();
    });
    expect(result.current.processing).toBe(true);

    await unmount();
    gate.resolve(PaymentOutcome.completed);
    await paying;
  });

  test('pagar que falla cuando la pantalla ya se cerró tampoco avisa', async () => {
    const { result, unmount } = await setup();
    const gate = createGate<PaymentOutcome>();
    let paying!: Promise<void>;
    await act(async () => {
      paying = result.current.pay(planDate, () => gate.promise);
      await flushMicrotasks();
    });

    await unmount();
    gate.reject(new DiversoError('RESERVA_VENCIDA'));
    await paying;
  });
});
