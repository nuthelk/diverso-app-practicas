import { act, renderHook, waitFor } from '@testing-library/react-native';

import { BookingStatus, DiversoError, VerifiedPaymentStatus } from '@/core';
import { PagoAbierto } from '@/features/checkout/pago-abierto';
import { usePagoResultadoViewModel } from '@/features/checkout/view-models/usePagoResultadoViewModel';

import { compuerta, esperar } from '../../../support/compuerta';
import { pagoDePrueba, PasarelaFalsa } from '../support/pasarela-falsa';

/**
 * Verificación del pago en el servidor (`pagos-verificar`): el resultado de la redirección del
 * navegador nunca se da por bueno. Sin red ni Supabase. Port 1:1 de
 * `pago_resultado_view_model_test.dart` (+ contrato de UNA sola clave y aviso de cada intento).
 */

async function crear(pasarela: PasarelaFalsa, { tx = 'tx-1', reserva = null }: { tx?: string | null; reserva?: string | null } = {}) {
  const cargandos: boolean[] = [];
  const intentos: number[] = [];
  const reintentandos: boolean[] = [];
  const r = await renderHook(() => {
    const vm = usePagoResultadoViewModel(
      { pasarela },
      { transactionId: tx, bookingId: reserva, maxIntentos: 3, pausaMs: 0 },
    );
    if (cargandos[cargandos.length - 1] !== vm.cargando) cargandos.push(vm.cargando);
    if (intentos[intentos.length - 1] !== vm.intentos) intentos.push(vm.intentos);
    if (reintentandos[reintentandos.length - 1] !== vm.reintentandoPago) reintentandos.push(vm.reintentandoPago);
    return vm;
  });
  return { ...r, cargandos, intentos, reintentandos };
}

const pendiente = () => pagoDePrueba(VerifiedPaymentStatus.pending, BookingStatus.pendingPayment);

test('aprobado: queda el resultado, sin reintentos, verificando por la transacción', async () => {
  const pasarela = new PasarelaFalsa([pagoDePrueba(VerifiedPaymentStatus.approved)]);
  const { result } = await crear(pasarela);
  await act(() => result.current.verificar());

  expect(result.current.resultado?.status).toBe(VerifiedPaymentStatus.approved);
  expect(result.current.falla).toBeNull();
  expect(result.current.cargando).toBe(false);
  expect(result.current.intentos).toBe(1);
  expect(pasarela.verificaciones).toEqual([{ transaccion: 'tx-1', reserva: null }]);
  // Contrato de pagos-verificar: exactamente UNA clave, nunca la otra en null.
  expect(pasarela.clavesVerificar).toEqual([['transactionId']]);
});

test('«Ya pagué, verificar» verifica por la reserva, sin transacción', async () => {
  const pasarela = new PasarelaFalsa([pagoDePrueba(VerifiedPaymentStatus.approved)]);
  const { result } = await crear(pasarela, { tx: null, reserva: 'res-1' });
  await act(() => result.current.verificar());
  expect(pasarela.verificaciones).toEqual([{ transaccion: null, reserva: 'res-1' }]);
  expect(pasarela.clavesVerificar).toEqual([['bookingId']]);
});

test('sin transacción ni reserva no hay nada que verificar', async () => {
  const { result } = await crear(new PasarelaFalsa(), { tx: null });
  expect(result.current.sinDatos).toBe(true);
});

test('pendiente: reintenta hasta el máximo y se queda en pendiente', async () => {
  const pasarela = new PasarelaFalsa([pendiente()]);
  const { result } = await crear(pasarela);
  await act(() => result.current.verificar());

  expect(pasarela.verificaciones).toHaveLength(3);
  expect(result.current.intentos).toBe(3);
  expect(result.current.resultado?.status).toBe(VerifiedPaymentStatus.pending);
  expect(result.current.cargando).toBe(false);
});

test('pendiente que se aprueba en el reintento deja de preguntar', async () => {
  const pasarela = new PasarelaFalsa([pendiente(), pagoDePrueba(VerifiedPaymentStatus.approved)]);
  const { result } = await crear(pasarela);
  await act(() => result.current.verificar());

  expect(pasarela.verificaciones).toHaveLength(2);
  expect(result.current.resultado?.status).toBe(VerifiedPaymentStatus.approved);
  expect(result.current.intentos).toBe(2);
});

test('rechazado no se reintenta: lo dice el servidor', async () => {
  const pasarela = new PasarelaFalsa([pagoDePrueba(VerifiedPaymentStatus.rejected, BookingStatus.pendingPayment)]);
  const { result } = await crear(pasarela);
  await act(() => result.current.verificar());
  expect(pasarela.verificaciones).toHaveLength(1);
  expect(result.current.resultado?.status).toBe(VerifiedPaymentStatus.rejected);
});

test('error del servidor: queda la falla con su mensaje y no se reintenta', async () => {
  const pasarela = new PasarelaFalsa([new DiversoError('MONTO_NO_COINCIDE')]);
  const { result } = await crear(pasarela);
  await act(() => result.current.verificar());

  expect(result.current.falla?.code).toBe('MONTO_NO_COINCIDE');
  expect(result.current.resultado).toBeNull();
  expect(result.current.cargando).toBe(false);
  expect(pasarela.verificaciones).toHaveLength(1);
});

test('error inesperado: falla ERROR_INESPERADO en vez de romper la pantalla', async () => {
  const { result } = await crear(new PasarelaFalsa([new Error('boom')]));
  await act(() => result.current.verificar());
  expect(result.current.falla?.code).toBe('ERROR_INESPERADO');
  expect(result.current.resultado).toBeNull();
});

test('«Reintentar» tras una falla verifica de nuevo desde cero', async () => {
  const pasarela = new PasarelaFalsa([new DiversoError('ERROR_RED'), pagoDePrueba(VerifiedPaymentStatus.approved)]);
  const { result, cargandos } = await crear(pasarela);
  await act(() => result.current.verificar());
  expect(result.current.falla).not.toBeNull();

  cargandos.length = 0;
  pasarela.compuerta = compuerta();
  let verificando!: Promise<void>;
  await act(async () => {
    verificando = result.current.verificar();
    await esperar();
  });
  expect(result.current.cargando).toBe(true);
  pasarela.compuerta.completar();
  await act(() => verificando);

  // Vuelve a cargar y termina.
  expect(cargandos).toEqual([true, false]);
  expect(result.current.falla).toBeNull();
  expect(result.current.resultado?.status).toBe(VerifiedPaymentStatus.approved);
  // Los intentos empiezan de cero.
  expect(result.current.intentos).toBe(1);
});

test('arranca cargando para que la pantalla no parpadee un estado vacío', async () => {
  const { result } = await crear(new PasarelaFalsa());
  expect(result.current.cargando).toBe(true);
  expect(result.current.resultado).toBeNull();
  expect(result.current.falla).toBeNull();
});

test('cada intento se avisa a la vista («… (intento N)»)', async () => {
  // Cada verificación espera su propia compuerta: así se ve el estado entre intentos.
  const puertas = [compuerta(), compuerta(), compuerta()];
  const pasarela = new PasarelaFalsa([pendiente()]);
  const verificarOriginal = pasarela.verify.bind(pasarela);
  let llamadas = 0;
  pasarela.verify = async (p) => {
    await puertas[llamadas++]!.promesa;
    return verificarOriginal(p);
  };
  const { result } = await crear(pasarela);
  let verificando!: Promise<void>;
  await act(async () => {
    verificando = result.current.verificar();
    await esperar();
  });
  for (let n = 1; n <= puertas.length; n++) {
    // Mientras espera la respuesta del intento n, la vista ya lo muestra.
    await waitFor(() => expect(llamadas).toBe(n));
    await waitFor(() => expect(result.current.intentos).toBe(n));
    expect(result.current.cargando).toBe(true);
    await act(async () => {
      puertas[n - 1]!.completar();
      await esperar();
    });
  }
  await act(() => verificando);
  expect(result.current.cargando).toBe(false);
});

describe('intentarDeNuevo («Intentar de nuevo» tras un pago rechazado)', () => {
  let abiertos: string[];
  beforeEach(() => {
    abiertos = [];
  });
  const abrir = (resultado: PagoAbierto) => async (id: string) => {
    abiertos.push(id);
    return resultado;
  };

  test('abre el pago de ESA reserva y deja el estado limpio', async () => {
    const { result, reintentandos } = await crear(new PasarelaFalsa());
    const puerta = compuerta();
    let reintentando!: Promise<void>;
    await act(async () => {
      reintentando = result.current.intentarDeNuevo('res-1', async (id) => {
        await puerta.promesa;
        return abrir(PagoAbierto.completado)(id);
      });
      await esperar();
    });
    expect(result.current.reintentandoPago).toBe(true);
    puerta.completar();
    await act(() => reintentando);

    expect(abiertos).toEqual(['res-1']);
    expect(reintentandos).toEqual([false, true, false]);
    expect(result.current.errorReintento).toBeNull();
  });

  test('bug F: en web queda redirigido y el botón se libera, sin error', async () => {
    const { result } = await crear(new PasarelaFalsa());
    await act(() => result.current.intentarDeNuevo('res-1', abrir(PagoAbierto.redirigido)));
    expect(result.current.reintentandoPago).toBe(false);
    expect(result.current.errorReintento).toBeNull();
  });

  test('cerrar el pago sin terminar avisa cómo seguir', async () => {
    const { result } = await crear(new PasarelaFalsa());
    await act(() => result.current.intentarDeNuevo('res-1', abrir(PagoAbierto.cerrado)));
    expect(result.current.errorReintento).toBe(
      'Cerraste el pago antes de terminar. Si ya pagaste, toca «Verificar de nuevo».',
    );
    expect(result.current.reintentandoPago).toBe(false);
  });

  test('error del servidor al abrir el pago: su mensaje en español', async () => {
    const { result } = await crear(new PasarelaFalsa());
    await act(() =>
      result.current.intentarDeNuevo('res-1', async () => {
        throw new DiversoError('RESERVA_VENCIDA');
      }),
    );
    expect(result.current.errorReintento).toBe(new DiversoError('RESERVA_VENCIDA').userMessage);
    expect(result.current.reintentandoPago).toBe(false);
  });

  test('error inesperado: mensaje genérico', async () => {
    const { result } = await crear(new PasarelaFalsa());
    await act(() =>
      result.current.intentarDeNuevo('res-1', async () => {
        throw new Error('boom');
      }),
    );
    expect(result.current.errorReintento).toBe('No pudimos iniciar el pago. Intenta de nuevo.');
  });

  test('un nuevo intento limpia el aviso anterior', async () => {
    const { result } = await crear(new PasarelaFalsa());
    await act(() => result.current.intentarDeNuevo('res-1', abrir(PagoAbierto.cerrado)));
    await act(() => result.current.intentarDeNuevo('res-1', abrir(PagoAbierto.completado)));
    expect(result.current.errorReintento).toBeNull();
  });

  test('mientras uno está en curso, otro toque se ignora', async () => {
    const { result } = await crear(new PasarelaFalsa());
    const puerta = compuerta<PagoAbierto>();
    await act(async () => {
      const primero = result.current.intentarDeNuevo('res-1', () => puerta.promesa);
      await result.current.intentarDeNuevo('res-1', abrir(PagoAbierto.completado));
      expect(abiertos).toEqual([]);
      puerta.completar(PagoAbierto.completado);
      await primero;
    });
  });

  test('si la pantalla se cierra mientras el pago se abre, no avisa a nadie', async () => {
    const { result, unmount } = await crear(new PasarelaFalsa());
    const puerta = compuerta<PagoAbierto>();
    let reintentando!: Promise<void>;
    await act(async () => {
      reintentando = result.current.intentarDeNuevo('res-1', () => puerta.promesa);
      await esperar();
    });

    await unmount();
    puerta.completar(PagoAbierto.completado);
    await reintentando;
  });
});

describe('guarda de desmontaje', () => {
  test('cerrar la pantalla durante la verificación corta el sondeo y no avisa', async () => {
    const pasarela = new PasarelaFalsa([pendiente()]);
    pasarela.compuerta = compuerta();
    const { result, unmount } = await crear(pasarela);
    let verificando!: Promise<void>;
    await act(async () => {
      verificando = result.current.verificar();
      await esperar();
    });

    await unmount();
    pasarela.compuerta.completar();
    await verificando;

    // No sigue preguntando.
    expect(pasarela.verificaciones).toHaveLength(1);
  });
});
