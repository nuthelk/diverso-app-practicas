import { BookingRepository } from '@/core/data/repositories/booking-repository';
import type { BookingApi } from '@/core/data/services/booking-api';
import { DiversoError } from '@/core/errors/diverso-error';
import { Booking } from '@/core/models/booking';
import { BookingStatus } from '@/core/models/enums';
import type { Row } from '@/core/models/row';
import { LABEL_REFUND_STATUS, RefundStatus } from '@/core/models/refund';
import { fechaLocal } from '@/core/utils/fechas';

import { EdgeFunctionsFalsas } from '../../../support/edge-functions-falsas';
import { capture, httpError, postgrestError } from '../../../support/errors';

/**
 * Api falsa: devuelve las filas que se le indiquen y registra qué se le pidió. No sabe nada de
 * Supabase; así se prueban las reglas del repositorio sin red.
 */
class BookingApiFalsa implements BookingApi {
  uid: string | null = 'viajero-1';
  /** Lo que lanza cualquier consulta (null = responde normal). */
  falla: unknown = null;

  filaCrear: Row = {};
  reservas: Row[] = [];
  resenas: Row[] = [];
  filaReserva: Row | null = null;
  filaResena: Row | null = null;
  pendientes: Row[] = [];
  filaVistaPrevia: Row = {};

  readonly consultas: string[] = [];
  creadaDespuesDe: Date | null = null;

  private consulta<T>(nombre: string, respuesta: T): T {
    this.consultas.push(nombre);
    if (this.falla !== null) throw this.falla;
    return respuesta;
  }

  async usuarioId() {
    return this.uid;
  }
  async crearReserva() {
    return this.consulta('crearReserva', this.filaCrear);
  }
  async reservasDe() {
    return this.consulta('reservasDe', this.reservas);
  }
  async resenasDe() {
    return this.consulta('resenasDe', this.resenas);
  }
  async reserva() {
    return this.consulta('reserva', this.filaReserva);
  }
  async resenaDe() {
    return this.consulta('resenaDe', this.filaResena);
  }
  async pendientesDe(p: { viajeroId: string; planDateId: string; creadaDespuesDe: Date }) {
    this.creadaDespuesDe = p.creadaDespuesDe;
    return this.consulta('pendientesDe', this.pendientes);
  }
  async vistaPreviaCancelacion() {
    return this.consulta('vistaPreviaCancelacion', this.filaVistaPrevia);
  }
}

const fila = (id: string, estado = 'confirmada'): Row => ({
  id,
  codigo: `DIV-${id}`,
  plan_date_id: 'pd-1',
  viajero_id: 'viajero-1',
  pax: 2,
  monto_total: 200000,
  estado,
  created_at: '2026-10-25T10:00:00+00:00',
});

const error = (accion: () => Promise<unknown>) => capture<DiversoError>(accion).then((e) => {
  expect(e).toBeInstanceOf(DiversoError);
  return e;
});

const repo = (api: BookingApiFalsa, edge?: EdgeFunctionsFalsas) =>
  new BookingRepository({
    api,
    edgeFunctions:
      edge ??
      new EdgeFunctionsFalsas(() => {
        throw new Error('sin Edge Functions');
      }),
  });

describe('crearReserva', () => {
  test('convierte la fila de create_booking en CreatedBooking', async () => {
    const api = new BookingApiFalsa();
    api.filaCrear = {
      booking_id: 'b-1',
      codigo: 'DIV-AB12',
      monto_total: 300000,
      plan_titulo: 'Guatapé',
      fecha: '2026-11-20',
    };
    const r = await repo(api).crearReserva({ planDateId: 'pd-1', pax: 2 });
    expect(r.bookingId).toBe('b-1');
    expect(r.code).toBe('DIV-AB12');
    expect(r.totalAmount).toBe(300000);
    expect(r.planTitle).toBe('Guatapé');
    expect(r.date).toEqual(fechaLocal(2026, 11, 20));
  });

  test('sin plan_titulo ni fecha: título vacío y fecha nula', async () => {
    const api = new BookingApiFalsa();
    api.filaCrear = { booking_id: 'b', codigo: 'C', monto_total: 1 };
    const r = await repo(api).crearReserva({ planDateId: 'pd-1', pax: 1 });
    expect(r.planTitle).toBe('');
    expect(r.date).toBeNull();
  });

  test('un error de PostgREST sale como DiversoError con su código', async () => {
    const api = new BookingApiFalsa();
    api.falla = postgrestError('SIN_CUPO', { code: 'P0001' });
    const e = await error(() => repo(api).crearReserva({ planDateId: 'pd-1', pax: 2 }));
    expect(e.code).toBe('SIN_CUPO');
    expect(e.userMessage).toContain('cupos');
  });

  test('RESERVA_PENDIENTE_EXISTENTE conserva el id de la reserva existente', async () => {
    const api = new BookingApiFalsa();
    api.falla = postgrestError('RESERVA_PENDIENTE_EXISTENTE', { code: 'P0001', details: 'b-9' });
    const e = await error(() => repo(api).crearReserva({ planDateId: 'pd-1', pax: 2 }));
    expect(e.code).toBe('RESERVA_PENDIENTE_EXISTENTE');
    expect(e.details?.['booking_id']).toBe('b-9');
  });

  test('un fallo que no es de PostgREST sale como ERROR_INESPERADO', async () => {
    const api = new BookingApiFalsa();
    api.falla = new Error('se cayó');
    const e = await error(() => repo(api).crearReserva({ planDateId: 'pd-1', pax: 2 }));
    expect(e.code).toBe('ERROR_INESPERADO');
  });
});

describe('misReservas', () => {
  test('sin sesión: lista vacía y no consulta nada', async () => {
    const api = new BookingApiFalsa();
    api.uid = null;
    expect(await repo(api).misReservas()).toEqual([]);
    expect(api.consultas).toEqual([]);
  });

  test('sin reservas: no pide las reseñas', async () => {
    const api = new BookingApiFalsa();
    expect(await repo(api).misReservas()).toEqual([]);
    expect(api.consultas).toEqual(['reservasDe']);
  });

  test('marca con reseña solo las reservas reseñadas y respeta el orden', async () => {
    const api = new BookingApiFalsa();
    api.reservas = [fila('b1'), fila('b2'), fila('b3')];
    api.resenas = [{ booking_id: 'b2' }];
    const r = await repo(api).misReservas();
    expect(r.map((b) => b.id)).toEqual(['b1', 'b2', 'b3']);
    expect(r.map((b) => b.hasReview)).toEqual([false, true, false]);
    expect(api.consultas).toEqual(['reservasDe', 'resenasDe']);
  });
});

describe('reserva (por id)', () => {
  test('sin reseña: la devuelve tal cual', async () => {
    const api = new BookingApiFalsa();
    api.filaReserva = fila('b1');
    const b = await repo(api).reserva('b1');
    expect(b.id).toBe('b1');
    expect(b.hasReview).toBe(false);
  });

  test('con reseña: la marca para no ofrecer «Reseñar» otra vez', async () => {
    const api = new BookingApiFalsa();
    api.filaReserva = fila('b1');
    api.filaResena = { id: 'r1' };
    expect((await repo(api).reserva('b1')).hasReview).toBe(true);
  });

  test('no existe: RESERVA_NO_EXISTE (no se convierte en ERROR_INESPERADO)', async () => {
    const api = new BookingApiFalsa();
    const e = await error(() => repo(api).reserva('nada'));
    expect(e.code).toBe('RESERVA_NO_EXISTE');
    expect(api.consultas).toEqual(['reserva']);
  });

  test('un error de PostgREST sale como DiversoError', async () => {
    const api = new BookingApiFalsa();
    api.falla = postgrestError('NO_AUTENTICADO', { code: 'P0001' });
    const e = await error(() => repo(api).reserva('b1'));
    expect(e.code).toBe('NO_AUTENTICADO');
  });
});

describe('reservaPendiente (ventana de 30 minutos)', () => {
  test('sin sesión: null y no consulta', async () => {
    const api = new BookingApiFalsa();
    api.uid = null;
    expect(await repo(api).reservaPendiente('pd-1')).toBeNull();
    expect(api.consultas).toEqual([]);
  });

  test('pide solo las creadas en los últimos 30 minutos (Booking.retencionMs)', async () => {
    const api = new BookingApiFalsa();
    const antes = Date.now();
    await repo(api).reservaPendiente('pd-1');
    const despues = Date.now();
    const desde = api.creadaDespuesDe!;
    // En JS un Date ya es un instante: la api lo envía con toISOString() (UTC, «Z»).
    expect(desde).toBeInstanceOf(Date);
    expect(Booking.holdMs).toBe(30 * 60 * 1000);
    expect(desde.getTime() < antes - Booking.holdMs).toBe(false);
    expect(desde.getTime() > despues - Booking.holdMs).toBe(false);
  });

  test('sin filas: null; con filas: la primera', async () => {
    const api = new BookingApiFalsa();
    expect(await repo(api).reservaPendiente('pd-1')).toBeNull();
    api.pendientes = [fila('b1', 'pendiente_pago'), fila('b0')];
    const b = await repo(api).reservaPendiente('pd-1');
    expect(b!.id).toBe('b1');
    expect(b!.status).toBe(BookingStatus.pendingPayment);
  });

  test('un error de PostgREST sale como DiversoError', async () => {
    const api = new BookingApiFalsa();
    api.falla = postgrestError('algo raro');
    const e = await error(() => repo(api).reservaPendiente('pd-1'));
    expect(e.code).toBe('ERROR_BD');
  });
});

describe('vistaPreviaCancelacion', () => {
  test('lee la fila del RPC', async () => {
    const api = new BookingApiFalsa();
    api.filaVistaPrevia = {
      booking_id: 'b',
      horas_antes: 30.5,
      aplica: true,
      porcentaje: 50,
      monto: 150000.0,
      motivo: 'x',
    };
    const v = await repo(api).vistaPreviaCancelacion('b');
    expect(v.percentage).toBe(50);
    expect(v.amount).toBe(150000);
  });

  test('un error de PostgREST sale como DiversoError', async () => {
    const api = new BookingApiFalsa();
    api.falla = postgrestError('NO_ES_DUENO', { code: 'P0001' });
    const e = await error(() => repo(api).vistaPreviaCancelacion('b'));
    expect(e.code).toBe('NO_ES_DUENO');
  });
});

describe('cancelar (reservas-cancelar)', () => {
  const cancelada = (r: Row) => ({ estado: 'cancelada', reembolso: r });

  test('llama a reservas-cancelar y lee el reembolso aprobado', async () => {
    const edge = new EdgeFunctionsFalsas(() =>
      cancelada({
        aplica: true,
        porcentaje: 50,
        monto: 150000,
        estado: 'aprobado',
        motivo: 'Cancelación con menos de 48 h y al menos 24 h de anticipación: reembolso del 50 %',
      }),
    );
    const r = await repo(new BookingApiFalsa(), edge).cancelar('b-1');
    expect(edge.llamadas).toHaveLength(1);
    expect(edge.llamadas[0]![0]).toBe('reservas-cancelar');
    expect(edge.llamadas[0]![1]).toStrictEqual({ booking_id: 'b-1' });
    expect(r.applies).toBe(true);
    expect(r.percentage).toBe(50);
    expect(r.amount).toBe(150000);
    expect(r.status).toBe(RefundStatus.approved);
    expect(LABEL_REFUND_STATUS[r.status]).toBe('Reembolso de prueba aprobado');
  });

  test('estados pendiente, rechazado y no_aplica', async () => {
    const casos: [string, RefundStatus, string][] = [
      ['pendiente', RefundStatus.pending, 'Reembolso de prueba pendiente'],
      ['rechazado', RefundStatus.rejected, 'Reembolso de prueba rechazado'],
      ['no_aplica', RefundStatus.notApplicable, 'Sin reembolso'],
    ];
    for (const [raw, esperado, etiqueta] of casos) {
      const edge = new EdgeFunctionsFalsas(() =>
        cancelada({
          aplica: raw !== 'no_aplica',
          porcentaje: raw === 'no_aplica' ? 0 : 100,
          monto: raw === 'no_aplica' ? 0 : 300000,
          estado: raw,
          motivo: 'm',
        }),
      );
      const r = await repo(new BookingApiFalsa(), edge).cancelar('b-1');
      expect(r.status).toBe(esperado);
      expect(LABEL_REFUND_STATUS[r.status]).toBe(etiqueta);
    }
  });

  test('errores de la función: ESTADO_INVALIDO', async () => {
    const edge = new EdgeFunctionsFalsas(() => httpError(409, { error: 'ESTADO_INVALIDO' }));
    const e = await error(() => repo(new BookingApiFalsa(), edge).cancelar('b-1'));
    expect(e.code).toBe('ESTADO_INVALIDO');
  });
});
