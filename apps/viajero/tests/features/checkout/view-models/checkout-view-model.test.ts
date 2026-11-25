import { act, renderHook } from '@testing-library/react-native';

import { DiversoError } from '@/core';
import { PagoAbierto } from '@/features/checkout/pago-abierto';
import { useCheckoutViewModel } from '@/features/checkout/view-models/useCheckoutViewModel';

import { compuerta, esperar } from '../../../support/compuerta';
import { fechaDePrueba, planDePrueba } from '../support/catalogo-falso';
import { pendienteDePrueba, ReservasFalsas } from '../support/reservas-falsas';

/**
 * Estado, comandos y guarda de desmontaje de `useCheckoutViewModel`. Las reglas de la reserva
 * pendiente están en `checkout-pendiente.test.tsx`. Sin red ni Supabase. Port 1:1 de
 * `checkout_view_model_test.dart` (+ la vibración al pagar).
 */

const fecha = fechaDePrueba();
const plan = planDePrueba({ fechas: [fecha] });

let reservas: ReservasFalsas;
let abiertos: string[];
let vibraciones: number;

beforeEach(() => {
  reservas = new ReservasFalsas();
  abiertos = [];
  vibraciones = 0;
});

const abrir = (terminado: boolean) => async (id: string) => {
  abiertos.push(id);
  return terminado ? PagoAbierto.completado : PagoAbierto.cerrado;
};

async function crear() {
  const procesandos: boolean[] = [];
  const r = await renderHook(() => {
    const vm = useCheckoutViewModel({ reservas }, { vibrar: () => vibraciones++ });
    if (procesandos[procesandos.length - 1] !== vm.procesando) procesandos.push(vm.procesando);
    return vm;
  });
  return { ...r, procesandos };
}

test('estado inicial: una persona, sin reserva, sin error ni proceso en curso', async () => {
  const { result } = await crear();
  expect(result.current.pax).toBe(1);
  expect(result.current.bookingId).toBeNull();
  expect(result.current.pendiente).toBeNull();
  expect(result.current.error).toBeNull();
  expect(result.current.procesando).toBe(false);
  expect(result.current.total(plan)).toBe(150000);
});

test('las personas van de 1 a 20 y el total las multiplica', async () => {
  const { result } = await crear();
  await act(() => result.current.setPax(0));
  expect(result.current.pax).toBe(1);
  await act(() => result.current.setPax(99));
  expect(result.current.pax).toBe(20);
  await act(() => result.current.setPax(3));
  expect(result.current.total(plan)).toBe(450000);
});

test('pagar avisa dos veces: empieza a procesar y termina (y vibra)', async () => {
  const { result, procesandos } = await crear();
  const puerta = compuerta();
  let pagando!: Promise<void>;
  await act(async () => {
    pagando = result.current.pagar(fecha, async (id) => {
      await puerta.promesa;
      return abrir(true)(id);
    });
    await esperar();
  });
  expect(result.current.procesando).toBe(true);
  puerta.completar();
  await act(() => pagando);

  expect(procesandos).toEqual([false, true, false]);
  expect(reservas.creadas).toEqual([{ planDateId: 'fecha-1', pax: 1 }]);
  expect(abiertos).toEqual(['nueva-1']);
  expect(result.current.bookingId).toBe('nueva-1');
  expect(result.current.error).toBeNull();
  expect(vibraciones).toBe(1);
});

test('cerrar el pago sin terminar deja el aviso y conserva la reserva para reintentar', async () => {
  const { result } = await crear();
  await act(() => result.current.pagar(fecha, abrir(false)));
  expect(result.current.error).toContain('Cerraste el pago antes de terminar');
  expect(result.current.error).toContain('Ya pagué, verificar');
  expect(result.current.bookingId).toBe('nueva-1');
  expect(result.current.procesando).toBe(false);
});

test('bug F: en web el pago queda redirigido y «Procesando…» termina, sin error', async () => {
  const { result } = await crear();
  await act(() =>
    result.current.pagar(fecha, async (id) => {
      abiertos.push(id);
      return PagoAbierto.redirigido;
    }),
  );
  expect(result.current.procesando).toBe(false);
  expect(result.current.error).toBeNull();
  // La reserva sigue lista para «Ya pagué, verificar».
  expect(result.current.bookingId).toBe('nueva-1');
  expect(abiertos).toEqual(['nueva-1']);
});

test('web: tras redirigir a Wompi el botón de pagar sigue bloqueado hasta que la página se descarga', async () => {
  const { result } = await crear();
  expect(result.current.puedePagar).toBe(true);
  await act(() => result.current.pagar(fecha, async () => PagoAbierto.redirigido));
  expect(result.current.puedePagar).toBe(false);
  expect(result.current.procesando).toBe(false);
});

test('web: un segundo toque tras redirigir no abre otro pago ni crea otra reserva', async () => {
  const { result } = await crear();
  await act(() =>
    result.current.pagar(fecha, async (id) => {
      abiertos.push(id);
      return PagoAbierto.redirigido;
    }),
  );
  await act(() => result.current.pagar(fecha, abrir(true)));
  expect(abiertos).toEqual(['nueva-1']);
  expect(reservas.creadas).toHaveLength(1);
});

test('web: completar la reserva pendiente y ser redirigido también bloquea pagar', async () => {
  reservas.pendiente = pendienteDePrueba({ pax: 2 });
  const { result } = await crear();
  await act(() => result.current.cargarPendiente(fecha));
  await act(() => result.current.completarPendiente(async () => PagoAbierto.redirigido));
  expect(result.current.puedePagar).toBe(false);
  expect(result.current.procesando).toBe(false);
});

test('cerrar el pago (móvil) deja pagar de nuevo: solo la redirección bloquea', async () => {
  const { result } = await crear();
  await act(() => result.current.pagar(fecha, abrir(false)));
  expect(result.current.puedePagar).toBe(true);
});

test('un error del servidor se muestra con su mensaje en español', async () => {
  reservas.falloAlCrear = new DiversoError('SIN_CUPO');
  const { result } = await crear();
  await act(() => result.current.pagar(fecha, abrir(true)));
  expect(result.current.error).toBe(new DiversoError('SIN_CUPO').mensajeUsuario);
  expect(result.current.bookingId).toBeNull();
  expect(result.current.procesando).toBe(false);
});

test('un error del servidor al abrir el pago se muestra y no pierde la reserva', async () => {
  const { result } = await crear();
  await act(() =>
    result.current.pagar(fecha, async () => {
      throw new DiversoError('RESERVA_VENCIDA');
    }),
  );
  expect(result.current.error).toBe(new DiversoError('RESERVA_VENCIDA').mensajeUsuario);
  expect(result.current.bookingId).toBe('nueva-1');
});

test('un error inesperado no se traga: mensaje genérico y el checkout sigue usable', async () => {
  reservas.falloAlBuscarPendiente = new Error('boom');
  const { result } = await crear();
  await act(() => result.current.pagar(fecha, abrir(true)));
  expect(result.current.error).toBe('No pudimos iniciar el pago. Intenta de nuevo.');
  expect(result.current.procesando).toBe(false);
  expect(abiertos).toEqual([]);
});

test('un nuevo intento limpia el error anterior', async () => {
  reservas.falloAlBuscarPendiente = new Error('boom');
  const { result } = await crear();
  await act(() => result.current.pagar(fecha, abrir(true)));
  reservas.falloAlBuscarPendiente = null;
  await act(() => result.current.pagar(fecha, abrir(true)));
  expect(result.current.error).toBeNull();
});

describe('guarda de desmontaje', () => {
  test('pagar que termina cuando la pantalla ya se cerró no avisa a nadie', async () => {
    const { result, unmount } = await crear();
    const puerta = compuerta<PagoAbierto>();
    let pagando!: Promise<void>;
    await act(async () => {
      pagando = result.current.pagar(fecha, () => puerta.promesa);
      await esperar();
    });
    expect(result.current.procesando).toBe(true);

    await unmount();
    puerta.completar(PagoAbierto.completado);
    await pagando;
  });

  test('pagar que falla cuando la pantalla ya se cerró tampoco avisa', async () => {
    const { result, unmount } = await crear();
    const puerta = compuerta<PagoAbierto>();
    let pagando!: Promise<void>;
    await act(async () => {
      pagando = result.current.pagar(fecha, () => puerta.promesa);
      await esperar();
    });

    await unmount();
    puerta.fallar(new DiversoError('RESERVA_VENCIDA'));
    await pagando;
  });
});
