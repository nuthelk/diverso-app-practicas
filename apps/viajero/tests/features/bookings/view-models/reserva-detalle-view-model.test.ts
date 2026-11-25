import { act, renderHook } from '@testing-library/react-native';

import { DiversoError, type Booking } from '@/core';
import { useReservaDetalleViewModel } from '@/features/bookings/view-models/useReservaDetalleViewModel';

import { compuerta } from '../../../support/compuerta';
import { ReservasFalsas, reservaDePrueba } from '../../../support/reservas-falsas';

/**
 * `useReservaDetalleViewModel` con un repositorio falso: carga por id (o usa la reserva que ya
 * tenía la lista), error, marca de cambios para la lista, acciones y protección tras desmontar.
 * Port 1:1 de `reserva_detalle_view_model_test.dart`.
 */

const ahora = new Date(Date.UTC(2026, 9, 25, 15, 0));
const enDias = (d: number) => new Date(ahora.getTime() + d * 24 * 60 * 60 * 1000);

let repo: ReservasFalsas;
beforeEach(() => {
  repo = new ReservasFalsas([reservaDePrueba({ salida: enDias(2) })]);
});

async function crear({ inicial }: { inicial?: Booking } = {}) {
  const cargandos: boolean[] = [];
  const r = await renderHook(() => {
    const vm = useReservaDetalleViewModel({ reservas: repo, bookingId: 'res-1', inicial, reloj: () => ahora });
    if (cargandos[cargandos.length - 1] !== vm.cargando) cargandos.push(vm.cargando);
    return vm;
  });
  return { ...r, cargandos };
}

describe('carga', () => {
  test('sin reserva previa: cargando, sin reserva ni error', async () => {
    const { result } = await crear();
    expect(result.current.cargando).toBe(true);
    expect(result.current.reserva).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.cambio).toBe(false);
  });

  test('con la reserva de la lista se pinta de inmediato y no se pide al backend', async () => {
    const { result } = await crear({ inicial: repo.lista[0] });
    expect(result.current.cargando).toBe(false);
    expect(result.current.reserva?.id).toBe('res-1');
    expect(repo.consultas).toEqual([]);
  });

  test('éxito: cargando → reserva, con una consulta por id', async () => {
    const { result, cargandos } = await crear();

    await act(() => result.current.cargar());

    expect(cargandos).toEqual([true, false]);
    expect(result.current.reserva?.id).toBe('res-1');
    expect(result.current.error).toBeNull();
    expect(repo.consultas).toEqual(['res-1']);
  });

  test('reserva que no existe: queda el motivo en `error` y reintentar lo limpia', async () => {
    repo.lista = [];
    const { result } = await crear();
    await act(() => result.current.cargar());

    expect(result.current.reserva).toBeNull();
    expect(result.current.cargando).toBe(false);
    expect(result.current.error).toBe(new DiversoError('RESERVA_NO_EXISTE').userMessage);

    repo.lista = [reservaDePrueba({ salida: enDias(2) })];
    await act(() => result.current.cargar());

    expect(result.current.error).toBeNull();
    expect(result.current.reserva?.id).toBe('res-1');
  });

  test('un error que no es de Diverso también queda como mensaje, no se pierde', async () => {
    repo.fallo = new Error('sin red');
    const { result } = await crear();
    await act(() => result.current.cargar());

    expect(result.current.error).not.toBeNull();
    expect(result.current.reserva).toBeNull();
  });

  test('si falla al actualizar una reserva ya visible, la deja y avisa en `mensaje`', async () => {
    const { result } = await crear({ inicial: repo.lista[0] });
    repo.fallo = new Error('sin red');

    await act(() => result.current.cargar());

    expect(result.current.reserva?.id).toBe('res-1');
    expect(result.current.error).toBeNull();
    expect(result.current.mensaje).toBe('No pudimos actualizar la reserva.');
  });

  test('no pierde la marca «ya reseñada» que traía la lista', async () => {
    const { result } = await crear({ inicial: reservaDePrueba({ tieneResena: true }) });
    await act(() => result.current.cargar());
    expect(result.current.reserva?.hasReview).toBe(true);
  });

  test('desmontada: una carga que termina después no avisa a nadie ni lanza', async () => {
    repo.compuerta = compuerta();
    const { result, unmount } = await crear();
    let carga!: Promise<void>;
    await act(async () => {
      carga = result.current.cargar();
    });
    await unmount();
    repo.compuerta.completar();

    await expect(carga).resolves.toBeUndefined();
  });
});

describe('cambios y acciones', () => {
  test('cancelar: avisa, marca que hubo cambios y recarga solo esta reserva', async () => {
    const { result } = await crear({ inicial: repo.lista[0] });

    let ok = false;
    await act(async () => {
      ok = await result.current.cancelar(repo.lista[0]!);
    });

    expect(ok).toBe(true);
    expect(result.current.cambio).toBe(true);
    expect(result.current.mensaje).toMatch(/^Reserva cancelada y cupos liberados\./);
    expect(repo.consultas).toEqual(['res-1']);
    expect(repo.consultasLista).toBe(0); // el detalle no recarga la lista de reservas
  });

  test('cancelar que el servidor rechaza explica el motivo (y aun así marca cambios)', async () => {
    const { result } = await crear({ inicial: repo.lista[0] });
    repo.falloAlCancelar = new DiversoError('ESTADO_INVALIDO');

    let ok = true;
    await act(async () => {
      ok = await result.current.cancelar(repo.lista[0]!);
    });
    expect(ok).toBe(false);
    expect(result.current.mensaje).toBe('La reserva ya no admite esta operación.');
    expect(result.current.cambio).toBe(true);
  });

  test('después del pago: marca cambios y vuelve a cargar la reserva', async () => {
    const { result } = await crear({ inicial: repo.lista[0] });

    await act(() => result.current.pagoIntentado());

    expect(result.current.cambio).toBe(true);
    expect(repo.consultas).toEqual(['res-1']);
  });

  test('reseña publicada: marca cambios y la reserva pasa a «ya reseñada»', async () => {
    const { result } = await crear({ inicial: reservaDePrueba({ salida: enDias(-2) }) });
    expect(result.current.puedeResenar(result.current.reserva!)).toBe(true);

    await act(async () => result.current.resenaPublicada());

    expect(result.current.cambio).toBe(true);
    expect(result.current.reserva?.hasReview).toBe(true);
    expect(result.current.puedeResenar(result.current.reserva!)).toBe(false);
  });

  test('puedeCancelar y puedeResenar salen de la reserva y del reloj', async () => {
    const { result } = await crear();
    const proxima = reservaDePrueba({ salida: enDias(2) });
    const pasada = reservaDePrueba({ salida: enDias(-1) });

    expect(result.current.puedeCancelar(proxima)).toBe(true);
    expect(result.current.puedeResenar(proxima)).toBe(false);
    expect(result.current.puedeCancelar(pasada)).toBe(false);
    expect(result.current.puedeResenar(pasada)).toBe(true);
  });
});
