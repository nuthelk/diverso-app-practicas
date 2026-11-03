import { beforeEach, describe, expect, it, vi } from 'vitest';

/** Cadena de la consulta de ventas que el panel le manda a Supabase (sin red). */
const rec = vi.hoisted(() => ({ llamadas: [] as [string, ...unknown[]][] }));

vi.mock('$lib/shared/api/supabase', () => {
  const consulta: Record<string, unknown> = {};
  for (const metodo of ['select', 'eq', 'gte', 'order', 'limit']) {
    consulta[metodo] = (...args: unknown[]) => {
      rec.llamadas.push([metodo, ...args]);
      return consulta;
    };
  }
  // La consulta se resuelve al hacerle await, como el builder de supabase-js.
  consulta.then = (resolver: (r: unknown) => void) => resolver({ data: [], error: null });
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
  });
});
