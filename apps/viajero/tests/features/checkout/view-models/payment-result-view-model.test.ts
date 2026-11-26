import { act, renderHook, waitFor } from '@testing-library/react-native';

import { BookingStatus, DiversoError, VerifiedPaymentStatus } from '@/core';
import { PaymentOutcome } from '@/features/checkout/payment-outcome';
import { usePaymentResultViewModel } from '@/features/checkout/view-models/usePaymentResultViewModel';

import { compuerta, esperar } from '../../../support/compuerta';
import { testPayment, FakePaymentGateway } from '../support/fake-payment-gateway';

/**
 * Verificación del pago en el servidor (`pagos-verificar`): el resultado de la redirección del
 * navegador nunca se da por bueno. Sin red ni Supabase. Port 1:1 de
 * `pago_resultado_view_model_test.dart` (+ contrato de UNA sola clave y aviso de cada intento).
 */

async function setup(gateway: FakePaymentGateway, { tx = 'tx-1', bookingId = null }: { tx?: string | null; bookingId?: string | null } = {}) {
  const loadingStates: boolean[] = [];
  const attemptStates: number[] = [];
  const retryingStates: boolean[] = [];
  const r = await renderHook(() => {
    const vm = usePaymentResultViewModel(
      { gateway },
      { transactionId: tx, bookingId, maxAttempts: 3, pauseMs: 0 },
    );
    if (loadingStates[loadingStates.length - 1] !== vm.loading) loadingStates.push(vm.loading);
    if (attemptStates[attemptStates.length - 1] !== vm.attempts) attemptStates.push(vm.attempts);
    if (retryingStates[retryingStates.length - 1] !== vm.retryingPayment) retryingStates.push(vm.retryingPayment);
    return vm;
  });
  return { ...r, loadingStates, attemptStates, retryingStates };
}

const pendingPayment = () => testPayment(VerifiedPaymentStatus.pending, BookingStatus.pendingPayment);

test('aprobado: queda el resultado, sin reintentos, verificando por la transacción', async () => {
  const gateway = new FakePaymentGateway([testPayment(VerifiedPaymentStatus.approved)]);
  const { result } = await setup(gateway);
  await act(() => result.current.verify());

  expect(result.current.result?.status).toBe(VerifiedPaymentStatus.approved);
  expect(result.current.failure).toBeNull();
  expect(result.current.loading).toBe(false);
  expect(result.current.attempts).toBe(1);
  expect(gateway.verifications).toEqual([{ transactionId: 'tx-1', bookingId: null }]);
  // Contrato de pagos-verificar: exactamente UNA clave, nunca la otra en null.
  expect(gateway.verifyKeys).toEqual([['transactionId']]);
});

test('«Ya pagué, verificar» verifica por la reserva, sin transacción', async () => {
  const gateway = new FakePaymentGateway([testPayment(VerifiedPaymentStatus.approved)]);
  const { result } = await setup(gateway, { tx: null, bookingId: 'res-1' });
  await act(() => result.current.verify());
  expect(gateway.verifications).toEqual([{ transactionId: null, bookingId: 'res-1' }]);
  expect(gateway.verifyKeys).toEqual([['bookingId']]);
});

test('sin transacción ni reserva no hay nada que verificar', async () => {
  const { result } = await setup(new FakePaymentGateway(), { tx: null });
  expect(result.current.noData).toBe(true);
});

test('pendiente: reintenta hasta el máximo y se queda en pendiente', async () => {
  const gateway = new FakePaymentGateway([pendingPayment()]);
  const { result } = await setup(gateway);
  await act(() => result.current.verify());

  expect(gateway.verifications).toHaveLength(3);
  expect(result.current.attempts).toBe(3);
  expect(result.current.result?.status).toBe(VerifiedPaymentStatus.pending);
  expect(result.current.loading).toBe(false);
});

test('pendiente que se aprueba en el reintento deja de preguntar', async () => {
  const gateway = new FakePaymentGateway([pendingPayment(), testPayment(VerifiedPaymentStatus.approved)]);
  const { result } = await setup(gateway);
  await act(() => result.current.verify());

  expect(gateway.verifications).toHaveLength(2);
  expect(result.current.result?.status).toBe(VerifiedPaymentStatus.approved);
  expect(result.current.attempts).toBe(2);
});

test('rechazado no se reintenta: lo dice el servidor', async () => {
  const gateway = new FakePaymentGateway([testPayment(VerifiedPaymentStatus.rejected, BookingStatus.pendingPayment)]);
  const { result } = await setup(gateway);
  await act(() => result.current.verify());
  expect(gateway.verifications).toHaveLength(1);
  expect(result.current.result?.status).toBe(VerifiedPaymentStatus.rejected);
});

test('error del servidor: queda la falla con su mensaje y no se reintenta', async () => {
  const gateway = new FakePaymentGateway([new DiversoError('MONTO_NO_COINCIDE')]);
  const { result } = await setup(gateway);
  await act(() => result.current.verify());

  expect(result.current.failure?.code).toBe('MONTO_NO_COINCIDE');
  expect(result.current.result).toBeNull();
  expect(result.current.loading).toBe(false);
  expect(gateway.verifications).toHaveLength(1);
});

test('error inesperado: falla ERROR_INESPERADO en vez de romper la pantalla', async () => {
  const { result } = await setup(new FakePaymentGateway([new Error('boom')]));
  await act(() => result.current.verify());
  expect(result.current.failure?.code).toBe('ERROR_INESPERADO');
  expect(result.current.result).toBeNull();
});

test('«Reintentar» tras una falla verifica de nuevo desde cero', async () => {
  const gateway = new FakePaymentGateway([new DiversoError('ERROR_RED'), testPayment(VerifiedPaymentStatus.approved)]);
  const { result, loadingStates } = await setup(gateway);
  await act(() => result.current.verify());
  expect(result.current.failure).not.toBeNull();

  loadingStates.length = 0;
  gateway.gate = compuerta();
  let verifying!: Promise<void>;
  await act(async () => {
    verifying = result.current.verify();
    await esperar();
  });
  expect(result.current.loading).toBe(true);
  gateway.gate.completar();
  await act(() => verifying);

  // Vuelve a cargar y termina.
  expect(loadingStates).toEqual([true, false]);
  expect(result.current.failure).toBeNull();
  expect(result.current.result?.status).toBe(VerifiedPaymentStatus.approved);
  // Los attemptStates empiezan de cero.
  expect(result.current.attempts).toBe(1);
});

test('arranca cargando para que la pantalla no parpadee un estado vacío', async () => {
  const { result } = await setup(new FakePaymentGateway());
  expect(result.current.loading).toBe(true);
  expect(result.current.result).toBeNull();
  expect(result.current.failure).toBeNull();
});

test('cada intento se avisa a la vista («… (intento N)»)', async () => {
  // Cada verificación espera su propia compuerta: así se ve el estado entre attemptStates.
  const gates = [compuerta(), compuerta(), compuerta()];
  const gateway = new FakePaymentGateway([pendingPayment()]);
  const originalVerify = gateway.verify.bind(gateway);
  let calls = 0;
  gateway.verify = async (p) => {
    await gates[calls++]!.promesa;
    return originalVerify(p);
  };
  const { result } = await setup(gateway);
  let verifying!: Promise<void>;
  await act(async () => {
    verifying = result.current.verify();
    await esperar();
  });
  for (let n = 1; n <= gates.length; n++) {
    // Mientras espera la respuesta del intento n, la vista ya lo muestra.
    await waitFor(() => expect(calls).toBe(n));
    await waitFor(() => expect(result.current.attempts).toBe(n));
    expect(result.current.loading).toBe(true);
    await act(async () => {
      gates[n - 1]!.completar();
      await esperar();
    });
  }
  await act(() => verifying);
  expect(result.current.loading).toBe(false);
});

describe('retryPayment («Intentar de nuevo» tras un pago rechazado)', () => {
  let opened: string[];
  beforeEach(() => {
    opened = [];
  });
  const fakeOpenPayment = (outcome: PaymentOutcome) => async (id: string) => {
    opened.push(id);
    return outcome;
  };

  test('abre el pago de ESA reserva y deja el estado limpio', async () => {
    const { result, retryingStates } = await setup(new FakePaymentGateway());
    const gate = compuerta();
    let retrying!: Promise<void>;
    await act(async () => {
      retrying = result.current.retryPayment('res-1', async (id) => {
        await gate.promesa;
        return fakeOpenPayment(PaymentOutcome.completed)(id);
      });
      await esperar();
    });
    expect(result.current.retryingPayment).toBe(true);
    gate.completar();
    await act(() => retrying);

    expect(opened).toEqual(['res-1']);
    expect(retryingStates).toEqual([false, true, false]);
    expect(result.current.retryError).toBeNull();
  });

  test('bug F: en web queda redirigido y el botón se libera, sin error', async () => {
    const { result } = await setup(new FakePaymentGateway());
    await act(() => result.current.retryPayment('res-1', fakeOpenPayment(PaymentOutcome.redirected)));
    expect(result.current.retryingPayment).toBe(false);
    expect(result.current.retryError).toBeNull();
  });

  test('cerrar el pago sin terminar avisa cómo seguir', async () => {
    const { result } = await setup(new FakePaymentGateway());
    await act(() => result.current.retryPayment('res-1', fakeOpenPayment(PaymentOutcome.closed)));
    expect(result.current.retryError).toBe(
      'Cerraste el pago antes de terminar. Si ya pagaste, toca «Verificar de nuevo».',
    );
    expect(result.current.retryingPayment).toBe(false);
  });

  test('error del servidor al abrir el pago: su mensaje en español', async () => {
    const { result } = await setup(new FakePaymentGateway());
    await act(() =>
      result.current.retryPayment('res-1', async () => {
        throw new DiversoError('RESERVA_VENCIDA');
      }),
    );
    expect(result.current.retryError).toBe(new DiversoError('RESERVA_VENCIDA').userMessage);
    expect(result.current.retryingPayment).toBe(false);
  });

  test('error inesperado: mensaje genérico', async () => {
    const { result } = await setup(new FakePaymentGateway());
    await act(() =>
      result.current.retryPayment('res-1', async () => {
        throw new Error('boom');
      }),
    );
    expect(result.current.retryError).toBe('No pudimos iniciar el pago. Intenta de nuevo.');
  });

  test('un nuevo intento limpia el aviso anterior', async () => {
    const { result } = await setup(new FakePaymentGateway());
    await act(() => result.current.retryPayment('res-1', fakeOpenPayment(PaymentOutcome.closed)));
    await act(() => result.current.retryPayment('res-1', fakeOpenPayment(PaymentOutcome.completed)));
    expect(result.current.retryError).toBeNull();
  });

  test('mientras uno está en curso, otro toque se ignora', async () => {
    const { result } = await setup(new FakePaymentGateway());
    const gate = compuerta<PaymentOutcome>();
    await act(async () => {
      const first = result.current.retryPayment('res-1', () => gate.promesa);
      await result.current.retryPayment('res-1', fakeOpenPayment(PaymentOutcome.completed));
      expect(opened).toEqual([]);
      gate.completar(PaymentOutcome.completed);
      await first;
    });
  });

  test('si la pantalla se cierra mientras el pago se abre, no avisa a nadie', async () => {
    const { result, unmount } = await setup(new FakePaymentGateway());
    const gate = compuerta<PaymentOutcome>();
    let retrying!: Promise<void>;
    await act(async () => {
      retrying = result.current.retryPayment('res-1', () => gate.promesa);
      await esperar();
    });

    await unmount();
    gate.completar(PaymentOutcome.completed);
    await retrying;
  });
});

describe('guarda de desmontaje', () => {
  test('cerrar la pantalla durante la verificación corta el sondeo y no avisa', async () => {
    const gateway = new FakePaymentGateway([pendingPayment()]);
    gateway.gate = compuerta();
    const { result, unmount } = await setup(gateway);
    let verifying!: Promise<void>;
    await act(async () => {
      verifying = result.current.verify();
      await esperar();
    });

    await unmount();
    gateway.gate.completar();
    await verifying;

    // No sigue preguntando.
    expect(gateway.verifications).toHaveLength(1);
  });
});
