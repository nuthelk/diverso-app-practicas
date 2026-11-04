import { beforeEach, describe, expect, it, vi } from 'vitest';
import { rec, reiniciar } from '$tests/supabase-falso';
import { quienesVan, resenasRecientes } from '$lib/features/resumen/api/resumen.api';

vi.mock('$lib/shared/api/supabase', () => import('$tests/supabase-falso'));

beforeEach(reiniciar);

describe('quiénes van', () => {
  it('pide las fechas a la función quienes_van y devuelve sus filas', async () => {
    const fila = {
      plan_date_id: 'pd-1',
      booking_id: 'b-1',
      codigo: 'DV-1',
      nombre_corto: 'Laura V.',
      pax: 2,
      estado: 'confirmada',
    };
    rec.respuestaRpc = { data: [fila], error: null };
    expect(await quienesVan(['pd-1', 'pd-2'])).toEqual([fila]);
    expect(rec.rpc).toEqual([['quienes_van', { p_plan_date_ids: ['pd-1', 'pd-2'] }]]);
  });

  it('sin fechas no llama al servidor', async () => {
    expect(await quienesVan([])).toEqual([]);
    expect(rec.rpc).toEqual([]);
  });

  it('una respuesta vacía es una lista vacía y un error se propaga', async () => {
    expect(await quienesVan(['pd-1'])).toEqual([]);
    const error = { message: 'permission denied for function quienes_van' };
    rec.respuestaRpc = { data: null, error };
    await expect(quienesVan(['pd-1'])).rejects.toBe(error);
  });
});

describe('reseñas recientes', () => {
  it('pide 3 por defecto a resenas_recientes_agencia', async () => {
    const fila = {
      calificacion: 5,
      comentario: null,
      nombre_corto: 'Daniela C.',
      plan_titulo: 'Río Claro',
      created_at: '2026-11-01T10:00:00Z',
    };
    rec.respuestaRpc = { data: [fila], error: null };
    expect(await resenasRecientes()).toEqual([fila]);
    expect(rec.rpc).toEqual([['resenas_recientes_agencia', { p_limite: 3 }]]);
  });

  it('acepta otro límite y propaga el error', async () => {
    await resenasRecientes(10);
    expect(rec.rpc).toEqual([['resenas_recientes_agencia', { p_limite: 10 }]]);
    const error = { message: 'boom' };
    rec.respuestaRpc = { data: null, error };
    await expect(resenasRecientes()).rejects.toBe(error);
  });
});
