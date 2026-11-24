import { act, renderHook } from '@testing-library/react-native';

import {
  Booking,
  BookingStatus,
  DiversoError,
  EstadoReembolso,
  ResultadoCancelacion,
  type BookingRepository,
  type Publico,
} from '@/core';
import { useBookingsViewModel } from '@/features/bookings/view-models/useBookingsViewModel';

import { compuerta } from '../../../support/compuerta';
import { doble } from '../../../support/dependencias-de-prueba';
import { ReservasFalsas, reservaDePrueba } from '../../../support/reservas-falsas';

/**
 * Caso real de L22: el 25-oct-2026 «Próximas» mostraba viajes del 3, 6, 12 y 18 de octubre
 * (ya salieron) y sin orden. Reloj fijo; sin red ni Supabase. Port 1:1 de
 * `bookings_view_model_test.dart`.
 */
const ahora = new Date(Date.UTC(2026, 9, 25, 15, 0));
const reloj = () => ahora;
const dia = (d: number) => new Date(Date.UTC(2026, 9, d, 13));
const minutos = (m: number) => new Date(ahora.getTime() + m * 60 * 1000);

function reserva(codigo: string, salida: Date, estado: BookingStatus = BookingStatus.confirmada) {
  return new Booking({
    id: codigo,
    codigo,
    planDateId: 'pd',
    viajeroId: 'v',
    pax: 2,
    montoTotal: 190000,
    estado,
    createdAt: dia(1),
    salidaAt: salida,
  });
}

async function crear(repo: Publico<BookingRepository>) {
  const cargandos: boolean[] = [];
  const r = await renderHook(() => {
    const vm = useBookingsViewModel({ reservas: repo, reloj });
    if (cargandos[cargandos.length - 1] !== vm.cargando) cargandos.push(vm.cargando);
    return vm;
  });
  return { ...r, cargandos };
}

async function cargado(lista: Booking[]) {
  const r = await crear(doble<Publico<BookingRepository>>('BookingRepository', { misReservas: async () => lista }));
  await act(() => r.result.current.cargar());
  return r.result;
}

const codigos = (l: readonly Booking[]) => l.map((b) => b.codigo);

test('L22: confirmadas del 3, 6, 12, 18 y 27 → solo el 27 es próximo; el resto, historial reciente primero', async () => {
  const c = await cargado([
    reserva('D27', dia(27)),
    reserva('D18', dia(18)),
    reserva('D03', dia(3)),
    reserva('D06', dia(6)),
    reserva('D12', dia(12)),
  ]);

  expect(codigos(c.current.activas)).toEqual(['D27']);
  expect(codigos(c.current.historial)).toEqual(['D18', 'D12', 'D06', 'D03']);
});

test('próximas: pendiente y confirmada con salida futura, la más cercana primero', async () => {
  const c = await cargado([
    reserva('D30', dia(30), BookingStatus.pendientePago),
    reserva('D28', dia(28)),
    reserva('D26', dia(26)),
  ]);

  expect(codigos(c.current.activas)).toEqual(['D26', 'D28', 'D30']);
  expect(c.current.historial).toEqual([]);
});

test('historial: canceladas y completadas (aunque su fecha sea futura) y pendientes ya vencidas por salida', async () => {
  const c = await cargado([
    reserva('CAN-FUT', dia(29), BookingStatus.cancelada),
    reserva('COMP', dia(10), BookingStatus.completada),
    reserva('PEND-PASADA', dia(20), BookingStatus.pendientePago),
    reserva('PROX', dia(27)),
  ]);

  expect(codigos(c.current.activas)).toEqual(['PROX']);
  expect(codigos(c.current.historial)).toEqual(['CAN-FUT', 'PEND-PASADA', 'COMP']);
});

test('límite: salida 1 minuto adelante es próxima y 1 minuto atrás es historial', async () => {
  const c = await cargado([reserva('ADELANTE', minutos(1)), reserva('ATRAS', minutos(-1))]);

  expect(codigos(c.current.activas)).toEqual(['ADELANTE']);
  expect(codigos(c.current.historial)).toEqual(['ATRAS']);
});

test('historial: las que no tienen salida van al final', async () => {
  const sinSalida = new Booking({ ...reserva('SIN', dia(1), BookingStatus.cancelada), salidaAt: null });
  const c = await cargado([sinSalida, reserva('D10', dia(10)), reserva('D12', dia(12))]);

  expect(codigos(c.current.historial)).toEqual(['D12', 'D10', 'SIN']);
});

test('PRESERVE: una lista vacía deja ambas pestañas vacías y cargar termina sin error', async () => {
  const c = await cargado([]);
  expect(c.current.activas).toEqual([]);
  expect(c.current.historial).toEqual([]);
  expect(c.current.cargando).toBe(false);
  expect(c.current.error).toBeNull();
});

describe('estados de la carga', () => {
  let repo: ReservasFalsas;
  beforeEach(() => {
    repo = new ReservasFalsas([reservaDePrueba()]);
  });

  test('antes de cargar: cargando, sin reservas ni error ni mensaje', async () => {
    const { result } = await crear(repo);
    expect(result.current.cargando).toBe(true);
    expect(result.current.reservas).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(result.current.mensaje).toBeNull();
  });

  test('éxito: cargando → listo con las reservas, una consulta', async () => {
    const { result, cargandos } = await crear(repo);

    await act(() => result.current.cargar());

    expect(cargandos).toEqual([true, false]);
    expect(result.current.reservas.map((b) => b.id)).toEqual(['res-1']);
    expect(result.current.error).toBeNull();
    expect(repo.consultasLista).toBe(1);
  });

  test('error: avisa «No pudimos cargar tus reservas.», sin reservas, y reintentar lo limpia', async () => {
    const { result } = await crear(repo);
    repo.fallo = new Error('sin red');
    await act(() => result.current.cargar());

    expect(result.current.error).toBe('No pudimos cargar tus reservas.');
    expect(result.current.cargando).toBe(false);
    expect(result.current.reservas).toEqual([]);

    repo.fallo = null;
    await act(() => result.current.cargar());

    expect(result.current.error).toBeNull();
    expect(result.current.reservas).toHaveLength(1);
  });

  test('vacío: sin reservas no hay error y ambas listas quedan vacías', async () => {
    const { result } = await crear(repo);
    repo.lista = [];
    await act(() => result.current.cargar());

    expect(result.current.reservas).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(result.current.activas).toEqual([]);
    expect(result.current.historial).toEqual([]);
  });

  test('el estado no se puede modificar desde fuera', async () => {
    const { result } = await crear(repo);
    await act(() => result.current.cargar());
    expect(() => (result.current.reservas as Booking[]).push(reservaDePrueba({ id: 'x' }))).toThrow(TypeError);
  });

  test('desmontada: una carga que termina después no avisa a nadie ni lanza', async () => {
    repo.compuerta = compuerta();
    const { result, unmount } = await crear(repo);
    let carga!: Promise<void>;
    await act(async () => {
      carga = result.current.cargar();
    });
    await unmount();
    repo.compuerta.completar();

    await expect(carga).resolves.toBeUndefined();
  });
});

describe('mensaje y cancelación', () => {
  let repo: ReservasFalsas;
  const unaReserva = reservaDePrueba({ salida: dia(27) });

  async function listo() {
    repo = new ReservasFalsas([unaReserva]);
    const r = await crear(repo);
    await act(() => r.result.current.cargar());
    return r.result;
  }

  test('avisar deja el texto en `mensaje`; limpiarMensaje lo consume', async () => {
    const vm = await listo();

    await act(async () => vm.current.avisar('Cerraste el pago'));
    expect(vm.current.mensaje).toBe('Cerraste el pago');

    // En Flutter consumir el aviso no notifica (el oyente lo volvería a mostrar). Aquí la vista
    // lo muestra desde un efecto sobre el texto: volver a null no lo muestra de nuevo.
    await act(async () => vm.current.limpiarMensaje());
    expect(vm.current.mensaje).toBeNull();
  });

  test('vistaPrevia devuelve el reembolso y no deja mensaje', async () => {
    const vm = await listo();
    let vista: Awaited<ReturnType<typeof vm.current.vistaPrevia>> = null;
    await act(async () => {
      vista = await vm.current.vistaPrevia(unaReserva);
    });
    expect(vista).not.toBeNull();
    expect(vista!.porcentaje).toBe(100);
    expect(vm.current.mensaje).toBeNull();
  });

  test('vistaPrevia que falla devuelve null y explica el motivo en `mensaje`', async () => {
    const vm = await listo();
    repo.falloAlCancelar = new DiversoError('RESERVA_YA_SALIO');

    let vista: unknown = 'sin llamar';
    await act(async () => {
      vista = await vm.current.vistaPrevia(unaReserva);
    });
    expect(vista).toBeNull();
    expect(vm.current.mensaje).toBe('Este viaje ya salió, así que la reserva ya no se puede pagar ni cancelar.');
  });

  test('cancelar: avisa con el reembolso y recarga la lista', async () => {
    const vm = await listo();
    let ok = false;
    await act(async () => {
      ok = await vm.current.cancelar(unaReserva);
    });

    expect(ok).toBe(true);
    expect(repo.canceladas).toEqual(['res-1']);
    expect(vm.current.mensaje).toBe(
      'Reserva cancelada y cupos liberados. Reembolso de prueba aprobado: $ 190.000 (100 %).',
    );
    expect(repo.consultasLista).toBe(2); // una al abrir y otra tras cancelar
  });

  test('cancelar sin reembolso solo dice «Sin reembolso»', async () => {
    const vm = await listo();
    repo.resultado = new ResultadoCancelacion({
      aplica: false,
      porcentaje: 0,
      monto: 0,
      estado: EstadoReembolso.noAplica,
      motivo: '',
    });

    await act(async () => {
      await vm.current.cancelar(unaReserva);
    });

    expect(vm.current.mensaje).toBe('Reserva cancelada y cupos liberados. Sin reembolso.');
  });

  test('cancelar que el servidor rechaza: explica el motivo y no recarga', async () => {
    const vm = await listo();
    repo.falloAlCancelar = new DiversoError('ESTADO_INVALIDO');

    let ok = true;
    await act(async () => {
      ok = await vm.current.cancelar(unaReserva);
    });

    expect(ok).toBe(false);
    expect(vm.current.mensaje).toBe('La reserva ya no admite esta operación.');
    expect(repo.canceladas).toEqual([]);
    expect(repo.consultasLista).toBe(1);
  });

  test('un error inesperado al cancelar también se explica, no se pierde', async () => {
    const vm = await listo();
    repo.falloAlCancelar = new Error('boom');

    let ok = true;
    await act(async () => {
      ok = await vm.current.cancelar(unaReserva);
    });
    expect(ok).toBe(false);
    expect(vm.current.mensaje).not.toBeNull();
  });

  test('puedeCancelar / puedeResenar siguen las reglas de Próximas e Historial', async () => {
    const vm = await listo();
    const proxima = reservaDePrueba({ salida: dia(27) });
    const pasada = reservaDePrueba({ salida: dia(10) });
    const cancelada = reservaDePrueba({ salida: dia(27), estado: BookingStatus.cancelada });

    expect(vm.current.puedeCancelar(proxima)).toBe(true);
    expect(vm.current.puedeResenar(proxima)).toBe(false);
    expect(vm.current.puedeCancelar(pasada)).toBe(false);
    expect(vm.current.puedeResenar(pasada)).toBe(true);
    expect(vm.current.puedeCancelar(cancelada)).toBe(false);
    expect(vm.current.puedeResenar(reservaDePrueba({ salida: dia(10), tieneResena: true }))).toBe(false);
  });

  test('las reglas del reloj se recalculan en cada lectura (no se cachean)', async () => {
    let momento = new Date(Date.UTC(2026, 9, 26, 12));
    repo = new ReservasFalsas([reservaDePrueba({ salida: dia(27) })]);
    const { result } = await renderHook(() => useBookingsViewModel({ reservas: repo, reloj: () => momento }));
    await act(() => result.current.cargar());
    expect(result.current.activas).toHaveLength(1);

    momento = new Date(Date.UTC(2026, 9, 28, 12));
    expect(result.current.puedeCancelar(repo.lista[0]!)).toBe(false);
    expect(result.current.puedeResenar(repo.lista[0]!)).toBe(true);
  });
});
