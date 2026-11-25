import { act, renderHook } from '@testing-library/react-native';

import { BookingStatus, DiversoError, type Booking } from '@/core';
import { useReviewViewModel } from '@/features/bookings/view-models/useReviewViewModel';

import { compuerta } from '../../../support/compuerta';
import { PublicadorDeResenasFalso, ReservasFalsas, reservaDePrueba } from '../../../support/reservas-falsas';

/**
 * `useReviewViewModel` con repositorios falsos: carga la reserva por id (o usa la de la lista),
 * decide si se puede reseñar, guarda la calificación y publica la reseña. Port 1:1 de
 * `review_view_model_test.dart`.
 */

const ahora = new Date(Date.UTC(2026, 9, 25, 15, 0));
const dias = (d: number) => new Date(ahora.getTime() + d * 24 * 60 * 60 * 1000);
const salida = dias(-3);

let reservas: ReservasFalsas;
let resenas: PublicadorDeResenasFalso;
beforeEach(() => {
  reservas = new ReservasFalsas([reservaDePrueba({ salida })]);
  resenas = new PublicadorDeResenasFalso();
});

async function crear({ adelantada }: { adelantada?: Booking } = {}) {
  return renderHook(() =>
    useReviewViewModel({ reservas, resenas, bookingId: 'res-1', adelantada, reloj: () => ahora }),
  );
}

describe('carga de la reserva', () => {
  test('sin reserva adelantada: cargando hasta que llega', async () => {
    const { result } = await crear();
    expect(result.current.cargando).toBe(true);
    expect(result.current.reserva).toBeNull();

    await act(() => result.current.cargar());

    expect(result.current.cargando).toBe(false);
    expect(result.current.reserva?.id).toBe('res-1');
    expect(result.current.puedeResenar).toBe(true);
    expect(reservas.consultas).toEqual(['res-1']);
  });

  test('con la reserva de «Mis reservas» no se vuelve a pedir', async () => {
    const { result } = await crear({ adelantada: reservas.lista[0] });
    expect(result.current.cargando).toBe(false);

    await act(() => result.current.cargar());

    expect(reservas.consultas).toEqual([]);
    expect(result.current.puedeResenar).toBe(true);
  });

  test('una reserva adelantada de otro id se ignora y se carga la pedida', async () => {
    const { result } = await crear({ adelantada: reservaDePrueba({ id: 'otra', salida }) });
    expect(result.current.cargando).toBe(true);

    await act(() => result.current.cargar());

    expect(result.current.reserva?.id).toBe('res-1');
  });

  test('error: queda el motivo y reintentar lo limpia', async () => {
    reservas.lista = [];
    const { result } = await crear();
    await act(() => result.current.cargar());

    expect(result.current.error).toBe(new DiversoError('RESERVA_NO_EXISTE').userMessage);
    expect(result.current.reserva).toBeNull();
    expect(result.current.puedeResenar).toBe(false);

    reservas.lista = [reservaDePrueba({ salida })];
    await act(() => result.current.cargar());

    expect(result.current.error).toBeNull();
    expect(result.current.reserva?.id).toBe('res-1');
  });

  test('un error que no es de Diverso también queda como mensaje', async () => {
    reservas.fallo = new Error('sin red');
    const { result } = await crear();
    await act(() => result.current.cargar());
    expect(result.current.error).not.toBeNull();
  });

  test.each([
    ['aún no viajó', () => reservaDePrueba({ salida: dias(1) })],
    ['ya reseñada', () => reservaDePrueba({ salida, tieneResena: true })],
    ['cancelada', () => reservaDePrueba({ salida, estado: BookingStatus.cancelled })],
    ['pendiente de pago', () => reservaDePrueba({ salida, estado: BookingStatus.pendingPayment })],
  ])('no se puede reseñar una reserva %s', async (_nombre, hacer) => {
    reservas.lista = [hacer()];
    const { result } = await crear();
    await act(() => result.current.cargar());

    expect(result.current.reserva).not.toBeNull();
    expect(result.current.puedeResenar).toBe(false);
  });

  test('desmontada: una carga que termina después no avisa a nadie ni lanza', async () => {
    reservas.compuerta = compuerta();
    const { result, unmount } = await crear();
    let carga!: Promise<void>;
    await act(async () => {
      carga = result.current.cargar();
    });
    await unmount();
    reservas.compuerta.completar();

    await expect(carga).resolves.toBeUndefined();
  });
});

describe('calificación y envío', () => {
  test('empieza en 5 estrellas y calificar la cambia (solo de 1 a 5)', async () => {
    const { result } = await crear({ adelantada: reservas.lista[0] });
    expect(result.current.calificacion).toBe(5);

    await act(async () => result.current.calificar(2));
    expect(result.current.calificacion).toBe(2);

    await act(async () => {
      result.current.calificar(0);
      result.current.calificar(6);
    });
    expect(result.current.calificacion).toBe(2);
  });

  test('enviar publica con la calificación y el comentario, y devuelve true', async () => {
    const { result } = await crear({ adelantada: reservas.lista[0] });
    await act(async () => result.current.calificar(4));

    let ok = false;
    await act(async () => {
      ok = await result.current.enviar('Muy bueno');
    });

    expect(ok).toBe(true);
    expect(resenas.creadas).toEqual([{ bookingId: 'res-1', calificacion: 4, comentario: 'Muy bueno' }]);
    expect(result.current.enviando).toBe(false);
    // La pantalla se cierra: el botón no se vuelve a activar.
    expect(result.current.publicada).toBe(true);
    expect(result.current.errorEnvio).toBeNull();
  });

  test('una reseña ya publicada no se publica dos veces', async () => {
    const { result } = await crear({ adelantada: reservas.lista[0] });
    await act(async () => {
      await result.current.enviar('a');
    });

    let ok = true;
    await act(async () => {
      ok = await result.current.enviar('a');
    });
    expect(ok).toBe(false);
    expect(resenas.creadas).toHaveLength(1);
  });

  test('mientras envía `enviando` es true y un segundo envío no publica dos veces', async () => {
    resenas.compuerta = compuerta();
    const { result } = await crear({ adelantada: reservas.lista[0] });

    let primero!: Promise<boolean>;
    await act(async () => {
      primero = result.current.enviar('a');
    });
    expect(result.current.enviando).toBe(true);
    let segundo = true;
    await act(async () => {
      segundo = await result.current.enviar('a');
    });
    expect(segundo).toBe(false);

    await act(async () => {
      resenas.compuerta!.completar();
      await primero;
    });
    await expect(primero).resolves.toBe(true);
    expect(resenas.creadas).toHaveLength(1);
  });

  test('si el servidor rechaza: false, `errorEnvio` con el motivo y se puede reintentar', async () => {
    resenas.fallo = new DiversoError('ESTADO_INVALIDO');
    const { result } = await crear({ adelantada: reservas.lista[0] });

    let ok = true;
    await act(async () => {
      ok = await result.current.enviar('');
    });

    expect(ok).toBe(false);
    expect(result.current.errorEnvio).toBe('La reserva ya no admite esta operación.');
    expect(result.current.enviando).toBe(false);
    expect(resenas.creadas).toEqual([]);

    resenas.fallo = null;
    await act(async () => {
      ok = await result.current.enviar('');
    });
    expect(ok).toBe(true);
    expect(result.current.errorEnvio).toBeNull();
  });

  test('un error inesperado al publicar también queda como mensaje y libera el botón', async () => {
    resenas.fallo = new Error('boom');
    const { result } = await crear({ adelantada: reservas.lista[0] });

    let ok = true;
    await act(async () => {
      ok = await result.current.enviar('');
    });
    expect(ok).toBe(false);
    expect(result.current.errorEnvio).not.toBeNull();
    expect(result.current.enviando).toBe(false);
  });

  test('desmontada: un envío que termina después no avisa a nadie ni lanza', async () => {
    resenas.compuerta = compuerta();
    const { result, unmount } = await crear({ adelantada: reservas.lista[0] });
    let envio!: Promise<boolean>;
    await act(async () => {
      envio = result.current.enviar('');
    });
    await unmount();
    resenas.compuerta.completar();

    await expect(envio).resolves.toBe(true);
  });
});
