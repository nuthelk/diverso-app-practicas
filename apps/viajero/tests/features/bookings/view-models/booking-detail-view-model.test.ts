import { act, renderHook } from '@testing-library/react-native';

import { DiversoError, type Booking } from '@/core';
import { useBookingDetailViewModel } from '@/features/bookings/view-models/useBookingDetailViewModel';

import { compuerta } from '../../../support/compuerta';
import { ReservasFalsas, reservaDePrueba } from '../../../support/reservas-falsas';

/**
 * `useReservaDetalleViewModel` con un repositorio falso: carga por id (o usa la reserva que ya
 * tenía la lista), error, marca de cambios para la lista, acciones y protección tras desmontar.
 * Port 1:1 de `reserva_detalle_view_model_test.dart`.
 */

const now = new Date(Date.UTC(2026, 9, 25, 15, 0));
const inDays = (d: number) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000);

let repo: ReservasFalsas;
beforeEach(() => {
  repo = new ReservasFalsas([reservaDePrueba({ salida: inDays(2) })]);
});

async function setup({ initial }: { initial?: Booking } = {}) {
  const loadingStates: boolean[] = [];
  const r = await renderHook(() => {
    const vm = useBookingDetailViewModel({ bookings: repo, bookingId: 'res-1', initial, clock: () => now });
    if (loadingStates[loadingStates.length - 1] !== vm.loading) loadingStates.push(vm.loading);
    return vm;
  });
  return { ...r, loadingStates };
}

describe('carga', () => {
  test('sin reserva previa: cargando, sin reserva ni error', async () => {
    const { result } = await setup();
    expect(result.current.loading).toBe(true);
    expect(result.current.booking).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.changed).toBe(false);
  });

  test('con la reserva de la lista se pinta de inmediato y no se pide al backend', async () => {
    const { result } = await setup({ initial: repo.lista[0] });
    expect(result.current.loading).toBe(false);
    expect(result.current.booking?.id).toBe('res-1');
    expect(repo.consultas).toEqual([]);
  });

  test('éxito: cargando → reserva, con una consulta por id', async () => {
    const { result, loadingStates } = await setup();

    await act(() => result.current.load());

    expect(loadingStates).toEqual([true, false]);
    expect(result.current.booking?.id).toBe('res-1');
    expect(result.current.error).toBeNull();
    expect(repo.consultas).toEqual(['res-1']);
  });

  test('reserva que no existe: queda el motivo en `error` y reintentar lo limpia', async () => {
    repo.lista = [];
    const { result } = await setup();
    await act(() => result.current.load());

    expect(result.current.booking).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(new DiversoError('RESERVA_NO_EXISTE').userMessage);

    repo.lista = [reservaDePrueba({ salida: inDays(2) })];
    await act(() => result.current.load());

    expect(result.current.error).toBeNull();
    expect(result.current.booking?.id).toBe('res-1');
  });

  test('un error que no es de Diverso también queda como mensaje, no se pierde', async () => {
    repo.fallo = new Error('sin red');
    const { result } = await setup();
    await act(() => result.current.load());

    expect(result.current.error).not.toBeNull();
    expect(result.current.booking).toBeNull();
  });

  test('si falla al actualizar una reserva ya visible, la deja y avisa en `message`', async () => {
    const { result } = await setup({ initial: repo.lista[0] });
    repo.fallo = new Error('sin red');

    await act(() => result.current.load());

    expect(result.current.booking?.id).toBe('res-1');
    expect(result.current.error).toBeNull();
    expect(result.current.message).toBe('No pudimos actualizar la reserva.');
  });

  test('no pierde la marca «ya reseñada» que traía la lista', async () => {
    const { result } = await setup({ initial: reservaDePrueba({ tieneResena: true }) });
    await act(() => result.current.load());
    expect(result.current.booking?.hasReview).toBe(true);
  });

  test('desmontada: una carga que termina después no avisa a nadie ni lanza', async () => {
    repo.compuerta = compuerta();
    const { result, unmount } = await setup();
    let pendingLoad!: Promise<void>;
    await act(async () => {
      pendingLoad = result.current.load();
    });
    await unmount();
    repo.compuerta.completar();

    await expect(pendingLoad).resolves.toBeUndefined();
  });
});

describe('cambios y acciones', () => {
  test('cancel: avisa, marca que hubo cambios y recarga solo esta reserva', async () => {
    const { result } = await setup({ initial: repo.lista[0] });

    let ok = false;
    await act(async () => {
      ok = await result.current.cancel(repo.lista[0]!);
    });

    expect(ok).toBe(true);
    expect(result.current.changed).toBe(true);
    expect(result.current.message).toMatch(/^Reserva cancelada y cupos liberados\./);
    expect(repo.consultas).toEqual(['res-1']);
    expect(repo.consultasLista).toBe(0); // el detalle no recarga la lista de reservas
  });

  test('cancelar que el servidor rechaza explica el motivo (y aun así marca cambios)', async () => {
    const { result } = await setup({ initial: repo.lista[0] });
    repo.falloAlCancelar = new DiversoError('ESTADO_INVALIDO');

    let ok = true;
    await act(async () => {
      ok = await result.current.cancel(repo.lista[0]!);
    });
    expect(ok).toBe(false);
    expect(result.current.message).toBe('La reserva ya no admite esta operación.');
    expect(result.current.changed).toBe(true);
  });

  test('después del pago: marca cambios y vuelve a cargar la reserva', async () => {
    const { result } = await setup({ initial: repo.lista[0] });

    await act(() => result.current.paymentAttempted());

    expect(result.current.changed).toBe(true);
    expect(repo.consultas).toEqual(['res-1']);
  });

  test('reseña publicada: marca cambios y la reserva pasa a «ya reseñada»', async () => {
    const { result } = await setup({ initial: reservaDePrueba({ salida: inDays(-2) }) });
    expect(result.current.canReview(result.current.booking!)).toBe(true);

    await act(async () => result.current.reviewPublished());

    expect(result.current.changed).toBe(true);
    expect(result.current.booking?.hasReview).toBe(true);
    expect(result.current.canReview(result.current.booking!)).toBe(false);
  });

  test('canCancel y canReview salen de la reserva y del reloj', async () => {
    const { result } = await setup();
    const upcoming = reservaDePrueba({ salida: inDays(2) });
    const past = reservaDePrueba({ salida: inDays(-1) });

    expect(result.current.canCancel(upcoming)).toBe(true);
    expect(result.current.canReview(upcoming)).toBe(false);
    expect(result.current.canCancel(past)).toBe(false);
    expect(result.current.canReview(past)).toBe(true);
  });
});
