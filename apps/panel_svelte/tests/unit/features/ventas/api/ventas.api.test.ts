import { beforeEach, describe, expect, it, vi } from 'vitest';

/** Cadena de la consulta de ventas que el panel le manda a Supabase (sin red). */
const rec = vi.hoisted(() => ({
  llamadas: [] as [string, ...unknown[]][],
  respuesta: { data: [], error: null } as { data: unknown; error: unknown },
}));

vi.mock('$lib/shared/api/supabase', () => {
  const consulta: Record<string, unknown> = {};
  for (const metodo of ['select', 'eq', 'gte', 'lte', 'order', 'limit']) {
    consulta[metodo] = (...args: unknown[]) => {
      rec.llamadas.push([metodo, ...args]);
      return consulta;
    };
  }
  // La consulta se resuelve al hacerle await, como el builder de supabase-js.
  consulta.then = (resolver: (r: unknown) => void) => resolver(rec.respuesta);
  return {
    supabase: {
      from: (tabla: string) => {
        rec.llamadas.push(['from', tabla]);
        return consulta;
      },
    },
  };
});

import { ventas } from '$lib/features/ventas/api/ventas.api';

beforeEach(() => {
  rec.llamadas = [];
  rec.respuesta = { data: [], error: null };
});

describe('ventas de la agencia', () => {
  it('sin «desde»: las últimas 200 creadas (lista de Ventas y Planes)', async () => {
    await ventas('ag-1');
    expect(rec.llamadas).toEqual([
      ['from', 'agency_sales'],
      ['select', '*'],
      ['eq', 'agency_id', 'ag-1'],
      ['order', 'created_at', { ascending: false }],
      ['limit', 200],
    ]);
  });

  it('con «desde»: todas las de viajes desde esa fecha, sin el tope de 200 (Resumen del mes)', async () => {
    await ventas('ag-1', '2026-10-01');
    expect(rec.llamadas).toContainEqual(['gte', 'fecha', '2026-10-01']);
    expect(rec.llamadas.some(([m]) => m === 'limit')).toBe(false);
    expect(rec.llamadas.some(([m]) => m === 'lte')).toBe(false);
  });

  it('con «desde» y «hasta»: los viajes del rango (extremos incluidos), sin tope (período del Resumen)', async () => {
    await ventas('ag-1', '2026-11-01', '2026-11-30');
    expect(rec.llamadas).toEqual([
      ['from', 'agency_sales'],
      ['select', '*'],
      ['eq', 'agency_id', 'ag-1'],
      ['lte', 'fecha', '2026-11-30'],
      ['gte', 'fecha', '2026-11-01'],
    ]);
  });

  it('solo «hasta»: conserva el orden y el tope de 200 de la lista de Ventas', async () => {
    await ventas('ag-1', undefined, '2026-11-30');
    expect(rec.llamadas).toEqual([
      ['from', 'agency_sales'],
      ['select', '*'],
      ['eq', 'agency_id', 'ag-1'],
      ['lte', 'fecha', '2026-11-30'],
      ['order', 'created_at', { ascending: false }],
      ['limit', 200],
    ]);
  });

  it('devuelve las filas y propaga el error de la consulta', async () => {
    rec.respuesta = { data: [{ booking_id: 'a' }], error: null };
    expect(await ventas('ag-1', '2026-11-01', '2026-11-30')).toEqual([{ booking_id: 'a' }]);
    rec.respuesta = { data: null, error: new Error('sin red') };
    await expect(ventas('ag-1', '2026-11-01', '2026-11-30')).rejects.toThrow('sin red');
  });
});
