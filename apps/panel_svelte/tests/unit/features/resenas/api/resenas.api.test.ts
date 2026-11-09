import { beforeEach, describe, expect, it, vi } from 'vitest';
import { rec, reiniciar } from '$tests/supabase-falso';
import { resenasAgencia } from '$lib/features/resenas/api/resenas.api';

vi.mock('$lib/shared/api/supabase', () => import('$tests/supabase-falso'));

beforeEach(reiniciar);

describe('reseñas de la agencia', () => {
  it('pide la página a resenas_agencia con el límite y el desplazamiento, y devuelve sus filas', async () => {
    const fila = {
      id: 'r-1',
      calificacion: 5,
      comentario: null,
      nombre_corto: 'Daniela C.',
      plan_titulo: 'Río Claro',
      created_at: '2026-11-01T10:00:00Z',
    };
    rec.respuestaRpc = { data: [fila], error: null };
    expect(await resenasAgencia({ limite: 20, desde: 40 })).toEqual([fila]);
    expect(rec.rpc).toEqual([['resenas_agencia', { p_limite: 20, p_desde: 40 }]]);
  });

  it('una respuesta vacía es una lista vacía y un error se propaga', async () => {
    expect(await resenasAgencia({ limite: 20, desde: 0 })).toEqual([]);
    const error = { message: 'permission denied for function resenas_agencia' };
    rec.respuestaRpc = { data: null, error };
    await expect(resenasAgencia({ limite: 20, desde: 0 })).rejects.toBe(error);
  });
});
