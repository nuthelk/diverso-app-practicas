import { ReviewRepository } from '@/core/data/repositories/review-repository';
import { DiversoError } from '@/core/errors/diverso-error';

import { capturar } from '../../../support/errores';
import { crearSupabaseFalso, cuerpoErrorPostgrest } from '../../../support/supabase-falso';

/** `ReviewRepository` no tiene test en Dart: se prueba contra el Supabase falso (HTTP). */
const fila = (id: string, nombre: string | null) => ({
  id,
  booking_id: `b-${id}`,
  plan_id: 'p-1',
  viajero_id: 'v',
  calificacion: 4,
  comentario: 'Muy bueno',
  created_at: '2026-10-25T10:00:00+00:00',
  profiles: nombre === null ? null : { nombre },
});

describe('porPlan', () => {
  test('pide las reseñas del plan con el nombre del autor, más recientes primero, 20 por defecto', async () => {
    const { client, pedidos } = crearSupabaseFalso(() => ({ cuerpo: [fila('r1', 'Ana'), fila('r2', null)] }));
    const r = await new ReviewRepository({ client }).porPlan('p-1');
    expect(pedidos[0]!.ruta).toBe('/rest/v1/reviews');
    expect(pedidos[0]!.params).toEqual({
      select: ['*,profiles(nombre)'],
      plan_id: ['eq.p-1'],
      order: ['created_at.desc'],
      limit: ['20'],
    });
    // El autor de reseñas ajenas llega null por RLS de profiles (igual que en Flutter).
    expect(r.map((x) => [x.id, x.viajeroNombre])).toEqual([
      ['r1', 'Ana'],
      ['r2', null],
    ]);
  });

  test('límite configurable y errores crudos (no se traducen, como en Dart)', async () => {
    const { client, pedidos } = crearSupabaseFalso(() => ({ status: 401, cuerpo: cuerpoErrorPostgrest('JWT expired', { code: 'PGRST301' }) }));
    const e = await capturar(() => new ReviewRepository({ client }).porPlan('p-1', { limit: 5 }));
    expect(pedidos[0]!.params['limit']).toEqual(['5']);
    expect(e).not.toBeInstanceOf(DiversoError);
    expect(e).toMatchObject({ message: 'JWT expired' });
  });
});

describe('crear', () => {
  test('inserta booking_id, calificación y el comentario recortado', async () => {
    const { client, pedidos } = crearSupabaseFalso(() => ({ status: 201 }));
    await new ReviewRepository({ client }).crear({ bookingId: 'b-1', calificacion: 5, comentario: '  ¡Genial!  ' });
    expect(pedidos[0]!.metodo).toBe('POST');
    expect(pedidos[0]!.ruta).toBe('/rest/v1/reviews');
    expect(pedidos[0]!.cuerpo).toStrictEqual({ booking_id: 'b-1', calificacion: 5, comentario: '¡Genial!' });
  });

  test('comentario vacío o ausente se guarda como null', async () => {
    const { client, pedidos } = crearSupabaseFalso(() => ({ status: 201 }));
    const repo = new ReviewRepository({ client });
    await repo.crear({ bookingId: 'b-1', calificacion: 3, comentario: '   ' });
    await repo.crear({ bookingId: 'b-2', calificacion: 3 });
    expect(pedidos.map((p) => (p.cuerpo as { comentario: unknown }).comentario)).toEqual([null, null]);
  });

  test('un rechazo de RLS sale como DiversoError', async () => {
    const { client } = crearSupabaseFalso(() => ({
      status: 403,
      cuerpo: cuerpoErrorPostgrest('new row violates row-level security policy for table "reviews"', { code: '42501' }),
    }));
    const e = await capturar<DiversoError>(() =>
      new ReviewRepository({ client }).crear({ bookingId: 'b-1', calificacion: 5 }),
    );
    expect(e).toBeInstanceOf(DiversoError);
    expect(e.codigo).toBe('ERROR_BD');
  });
});
