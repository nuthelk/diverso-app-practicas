import { ReviewRepository } from '@/core/data/repositories/review-repository';
import { DiversoError } from '@/core/errors/diverso-error';

import { capture } from '../../../support/errors';
import { createFakeSupabase, postgrestErrorBody } from '../../../support/fake-supabase';

/** `ReviewRepository` no tiene test en Dart: se prueba contra el Supabase falso (HTTP). */
const row = (id: string, name: string | null) => ({
  id,
  booking_id: `b-${id}`,
  plan_id: 'p-1',
  viajero_id: 'v',
  calificacion: 4,
  comentario: 'Muy bueno',
  created_at: '2026-10-25T10:00:00+00:00',
  profiles: name === null ? null : { nombre: name },
});

describe('byPlan', () => {
  test('pide las reseñas del plan con el nombre del autor, más recientes primero, 20 por defecto', async () => {
    const { client, requests } = createFakeSupabase(() => ({ body: [row('r1', 'Ana'), row('r2', null)] }));
    const r = await new ReviewRepository({ client }).byPlan('p-1');
    expect(requests[0]!.path).toBe('/rest/v1/reviews');
    expect(requests[0]!.params).toEqual({
      select: ['*,profiles(nombre)'],
      plan_id: ['eq.p-1'],
      order: ['created_at.desc'],
      limit: ['20'],
    });
    // El autor de reseñas ajenas llega null por RLS de profiles (igual que en Flutter).
    expect(r.map((x) => [x.id, x.travelerName])).toEqual([
      ['r1', 'Ana'],
      ['r2', null],
    ]);
  });

  test('límite configurable y errores crudos (no se traducen, como en Dart)', async () => {
    const { client, requests } = createFakeSupabase(() => ({ status: 401, body: postgrestErrorBody('JWT expired', { code: 'PGRST301' }) }));
    const e = await capture(() => new ReviewRepository({ client }).byPlan('p-1', { limit: 5 }));
    expect(requests[0]!.params['limit']).toEqual(['5']);
    expect(e).not.toBeInstanceOf(DiversoError);
    expect(e).toMatchObject({ message: 'JWT expired' });
  });
});

describe('crear', () => {
  test('inserta booking_id, calificación y el comentario recortado', async () => {
    const { client, requests } = createFakeSupabase(() => ({ status: 201 }));
    await new ReviewRepository({ client }).create({ bookingId: 'b-1', rating: 5, comment: '  ¡Genial!  ' });
    expect(requests[0]!.method).toBe('POST');
    expect(requests[0]!.path).toBe('/rest/v1/reviews');
    expect(requests[0]!.body).toStrictEqual({ booking_id: 'b-1', calificacion: 5, comentario: '¡Genial!' });
  });

  test('comentario vacío o ausente se guarda como null', async () => {
    const { client, requests } = createFakeSupabase(() => ({ status: 201 }));
    const repo = new ReviewRepository({ client });
    await repo.create({ bookingId: 'b-1', rating: 3, comment: '   ' });
    await repo.create({ bookingId: 'b-2', rating: 3 });
    expect(requests.map((p) => (p.body as { comentario: unknown }).comentario)).toEqual([null, null]);
  });

  test('un rechazo de RLS sale como DiversoError', async () => {
    const { client } = createFakeSupabase(() => ({
      status: 403,
      body: postgrestErrorBody('new row violates row-level security policy for table "reviews"', { code: '42501' }),
    }));
    const e = await capture<DiversoError>(() =>
      new ReviewRepository({ client }).create({ bookingId: 'b-1', rating: 5 }),
    );
    expect(e).toBeInstanceOf(DiversoError);
    expect(e.code).toBe('ERROR_BD');
  });
});
