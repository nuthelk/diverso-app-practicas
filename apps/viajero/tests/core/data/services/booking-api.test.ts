import { PostgrestError } from '@supabase/supabase-js';

import { BookingRepository } from '@/core/data/repositories/booking-repository';
import { BookingApiSupabase } from '@/core/data/services/booking-api';
import { utcDate } from '@/core/utils/dates';

import { FakeEdgeFunctions } from '../../../support/fake-edge-functions';
import { createFakeSupabase, postgrestErrorBody, fakeSession } from '../../../support/fake-supabase';

/** Fila de `bookings` con el embebido que pide `BookingApi` (plan → agencia). */
const bookingRow = {
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
    const { client, requests } = createFakeSupabase((p) =>
      p.path === '/rest/v1/bookings' ? { body: [bookingRow] } : { body: [] },
    );
    const select = (await new BookingApiSupabase({ client }).booking('b1'), requests[0]!.params['select']);
    // En Flutter el alias era `agency:agencies(*)` y Plan.fromMap leía `agencies`: la agencia nunca llegaba.
    expect(select).toEqual([
      '*,plan_date:plan_dates(*,plan:plans(*,agencies(*))),payments(*),' +
        'refunds(id,booking_id,monto,porcentaje,estado,origen,motivo,created_at)',
    ]);
    expect(requests[0]!.params['id']).toEqual(['eq.b1']);
  });

  test('S5 de punta a punta: el repositorio entrega la reserva con su agencia', async () => {
    const { client } = createFakeSupabase((p) =>
      p.path === '/rest/v1/bookings' ? { body: [bookingRow] } : { body: [] },
    );
    const repo = new BookingRepository({
      api: new BookingApiSupabase({ client }),
      edgeFunctions: new FakeEdgeFunctions(() => ({})),
    });
    const b = await repo.booking('b1');
    expect(b.plan?.title).toBe('Guatapé');
    expect(b.plan?.agency?.name).toBe('Rutas de Antioquia');
    expect(b.hasReview).toBe(false);
  });

  test('reservasDe, resenasDe y resenaDe piden lo mismo que en Dart', async () => {
    const { client, requests } = createFakeSupabase();
    const api = new BookingApiSupabase({ client });
    await api.bookingsOf('v-1');
    await api.reviewsOf('v-1');
    expect(await api.reviewOf('b-1')).toBeNull();
    expect(requests.map((p) => [p.path, p.params['viajero_id'] ?? p.params['booking_id'], p.params['order']])).toEqual([
      ['/rest/v1/bookings', ['eq.v-1'], ['created_at.desc']],
      ['/rest/v1/reviews', ['eq.v-1'], undefined],
      ['/rest/v1/reviews', ['eq.b-1'], undefined],
    ]);
    expect(requests[1]!.params['select']).toEqual(['booking_id']);
    expect(requests[2]!.params['select']).toEqual(['id']);
  });

  test('pendientesDe: pendiente_pago de esa fecha, creadas después del instante (ISO UTC), la más reciente', async () => {
    const { client, requests } = createFakeSupabase();
    await new BookingApiSupabase({ client }).pendingOf({
      travelerId: 'v-1',
      planDateId: 'pd-1',
      createdAfter: utcDate(2026, 10, 25, 9, 30),
    });
    expect(requests[0]!.params).toEqual({
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
    const { client, requests } = createFakeSupabase(() => ({ body: { ok: true } }));
    const api = new BookingApiSupabase({ client });
    expect(await api.createBooking({ planDateId: 'pd-1', pax: 3 })).toEqual({ ok: true });
    await api.cancellationPreview('b-1');
    expect(requests.map((p) => [p.path, p.body])).toEqual([
      ['/rest/v1/rpc/create_booking', { p_plan_date_id: 'pd-1', p_pax: 3 }],
      ['/rest/v1/rpc/vista_previa_cancelacion', { p_booking_id: 'b-1' }],
    ]);
  });

  test('el raise exception del RPC sale como PostgrestError con message y details', async () => {
    const { client } = createFakeSupabase(() => ({
      status: 400,
      body: postgrestErrorBody('RESERVA_PENDIENTE_EXISTENTE', { details: 'b-9' }),
    }));
    const e = await new BookingApiSupabase({ client }).createBooking({ planDateId: 'pd', pax: 1 }).catch((x) => x);
    expect(e).toBeInstanceOf(PostgrestError);
    expect(e).toMatchObject({ message: 'RESERVA_PENDIENTE_EXISTENTE', details: 'b-9' });
  });

  test('usuarioId: null sin sesión; el id tras iniciar sesión', async () => {
    const { client } = createFakeSupabase((p) => (p.path === '/auth/v1/token' ? { body: fakeSession('u-7') } : {}));
    const api = new BookingApiSupabase({ client });
    expect(await api.currentUserId()).toBeNull();
    await client.auth.signInWithPassword({ email: 'a@b.co', password: 'x' });
    expect(await api.currentUserId()).toBe('u-7');
  });
});
