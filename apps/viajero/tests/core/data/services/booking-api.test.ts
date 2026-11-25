import { PostgrestError } from '@supabase/supabase-js';

import { BookingRepository } from '@/core/data/repositories/booking-repository';
import { BookingApiSupabase } from '@/core/data/services/booking-api';
import { fechaUtc } from '@/core/utils/fechas';

import { EdgeFunctionsFalsas } from '../../../support/edge-functions-falsas';
import { crearSupabaseFalso, cuerpoErrorPostgrest, sesionFalsa } from '../../../support/supabase-falso';

/** Fila de `bookings` con el embebido que pide `BookingApi` (plan → agencia). */
const filaReserva = {
  id: 'b1',
  codigo: 'DIV-B1',
  plan_date_id: 'pd-1',
  viajero_id: 'viajero-1',
  pax: 2,
  monto_total: 200000,
  estado: 'confirmada',
  created_at: '2026-10-25T10:00:00+00:00',
  salida_at: '2026-11-20T11:00:00+00:00',
  plan_date: {
    id: 'pd-1',
    plan_id: 'p-1',
    fecha: '2026-11-20',
    cupo_total: 10,
    cupo_disponible: 4,
    plan: {
      id: 'p-1',
      agency_id: 'a-1',
      titulo: 'Guatapé',
      destino: 'Guatapé',
      precio_cop: 100000,
      agencies: { id: 'a-1', nombre: 'Rutas de Antioquia', numero_rnt: '12345' },
    },
  },
  payments: [],
  refunds: [],
};

describe('BookingApiSupabase', () => {
  test('S5: la reserva embebe la agencia del plan con la clave que lee Plan.fromMap', async () => {
    const { client, pedidos } = crearSupabaseFalso((p) =>
      p.ruta === '/rest/v1/bookings' ? { cuerpo: [filaReserva] } : { cuerpo: [] },
    );
    const select = (await new BookingApiSupabase({ client }).reserva('b1'), pedidos[0]!.params['select']);
    // En Flutter el alias era `agency:agencies(*)` y Plan.fromMap leía `agencies`: la agencia nunca llegaba.
    expect(select).toEqual([
      '*,plan_date:plan_dates(*,plan:plans(*,agencies(*))),payments(*),' +
        'refunds(id,booking_id,monto,porcentaje,estado,origen,motivo,created_at)',
    ]);
    expect(pedidos[0]!.params['id']).toEqual(['eq.b1']);
  });

  test('S5 de punta a punta: el repositorio entrega la reserva con su agencia', async () => {
    const { client } = crearSupabaseFalso((p) =>
      p.ruta === '/rest/v1/bookings' ? { cuerpo: [filaReserva] } : { cuerpo: [] },
    );
    const repo = new BookingRepository({
      api: new BookingApiSupabase({ client }),
      edgeFunctions: new EdgeFunctionsFalsas(() => ({})),
    });
    const b = await repo.reserva('b1');
    expect(b.plan?.titulo).toBe('Guatapé');
    expect(b.plan?.agency?.nombre).toBe('Rutas de Antioquia');
    expect(b.tieneResena).toBe(false);
  });

  test('reservasDe, resenasDe y resenaDe piden lo mismo que en Dart', async () => {
    const { client, pedidos } = crearSupabaseFalso();
    const api = new BookingApiSupabase({ client });
    await api.reservasDe('v-1');
    await api.resenasDe('v-1');
    expect(await api.resenaDe('b-1')).toBeNull();
    expect(pedidos.map((p) => [p.ruta, p.params['viajero_id'] ?? p.params['booking_id'], p.params['order']])).toEqual([
      ['/rest/v1/bookings', ['eq.v-1'], ['created_at.desc']],
      ['/rest/v1/reviews', ['eq.v-1'], undefined],
      ['/rest/v1/reviews', ['eq.b-1'], undefined],
    ]);
    expect(pedidos[1]!.params['select']).toEqual(['booking_id']);
    expect(pedidos[2]!.params['select']).toEqual(['id']);
  });

  test('pendientesDe: pendiente_pago de esa fecha, creadas después del instante (ISO UTC), la más reciente', async () => {
    const { client, pedidos } = crearSupabaseFalso();
    await new BookingApiSupabase({ client }).pendientesDe({
      viajeroId: 'v-1',
      planDateId: 'pd-1',
      creadaDespuesDe: fechaUtc(2026, 10, 25, 9, 30),
    });
    expect(pedidos[0]!.params).toEqual({
      select: ['*'],
      viajero_id: ['eq.v-1'],
      plan_date_id: ['eq.pd-1'],
      estado: ['eq.pendiente_pago'],
      created_at: ['gt.2026-10-25T09:30:00.000Z'],
      order: ['created_at.desc'],
      limit: ['1'],
    });
  });

  test('RPC create_booking y vista_previa_cancelacion con sus parámetros', async () => {
    const { client, pedidos } = crearSupabaseFalso(() => ({ cuerpo: { ok: true } }));
    const api = new BookingApiSupabase({ client });
    expect(await api.crearReserva({ planDateId: 'pd-1', pax: 3 })).toEqual({ ok: true });
    await api.vistaPreviaCancelacion('b-1');
    expect(pedidos.map((p) => [p.ruta, p.cuerpo])).toEqual([
      ['/rest/v1/rpc/create_booking', { p_plan_date_id: 'pd-1', p_pax: 3 }],
      ['/rest/v1/rpc/vista_previa_cancelacion', { p_booking_id: 'b-1' }],
    ]);
  });

  test('el raise exception del RPC sale como PostgrestError con message y details', async () => {
    const { client } = crearSupabaseFalso(() => ({
      status: 400,
      cuerpo: cuerpoErrorPostgrest('RESERVA_PENDIENTE_EXISTENTE', { details: 'b-9' }),
    }));
    const e = await new BookingApiSupabase({ client }).crearReserva({ planDateId: 'pd', pax: 1 }).catch((x) => x);
    expect(e).toBeInstanceOf(PostgrestError);
    expect(e).toMatchObject({ message: 'RESERVA_PENDIENTE_EXISTENTE', details: 'b-9' });
  });

  test('usuarioId: null sin sesión; el id tras iniciar sesión', async () => {
    const { client } = crearSupabaseFalso((p) => (p.ruta === '/auth/v1/token' ? { cuerpo: sesionFalsa('u-7') } : {}));
    const api = new BookingApiSupabase({ client });
    expect(await api.usuarioId()).toBeNull();
    await client.auth.signInWithPassword({ email: 'a@b.co', password: 'x' });
    expect(await api.usuarioId()).toBe('u-7');
  });
});
