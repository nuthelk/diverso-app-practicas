import { CatalogApiSupabase } from '@/core/data/services/catalog-api';
import { ExperienceCategory } from '@/core/models/enums';
import { OrdenCatalogo } from '@/core/models/filtros-catalogo';

import { crearSupabaseFalso } from '../../../support/supabase-falso';

/**
 * La consulta que `CatalogApi` le manda a PostgREST, vista en un fetch falso que contesta `[]`:
 * el filtro por día debe actuar sobre los planes (antes del límite de 60), no solo sobre las
 * fechas embebidas.
 */
async function consulta(extra: { fecha?: string } = {}) {
  const { client, pedidos } = crearSupabaseFalso();
  await new CatalogApiSupabase({ client }).planesPublicados({
    desde: '2026-11-02',
    orden: OrdenCatalogo.rating,
    ...extra,
  });
  expect(pedidos).toHaveLength(1);
  return pedidos[0]!.params;
}

test('con día elegido: unión interna con plan_dates y filtro de ese día en la consulta', async () => {
  const q = await consulta({ fecha: '2026-11-05' });
  expect(q['select']).toEqual(['*,agencies(*),plan_dates!inner(*)']);
  expect(q['plan_dates.fecha']).toEqual(expect.arrayContaining(['eq.2026-11-05', 'gte.2026-11-02']));
  expect(q['limit']).toEqual(['60']);
});

test('sin día elegido: la consulta de siempre, con plan_dates opcional', async () => {
  const q = await consulta();
  expect(q['select']).toEqual(['*,agencies(*),plan_dates(*)']);
  expect(q['plan_dates.fecha']).toEqual(['gte.2026-11-02']);
  expect(q['limit']).toEqual(['60']);
});

describe('CatalogApiSupabase (extra del port)', () => {
  test('todos los filtros y el orden embebido de las fechas', async () => {
    const { client, pedidos } = crearSupabaseFalso();
    await new CatalogApiSupabase({ client }).planesPublicados({
      desde: '2026-11-02',
      orden: OrdenCatalogo.precioDesc,
      busqueda: 'guatape',
      categoria: ExperienceCategory.gastronomia,
      destino: 'Jericó',
      precioMax: 250000,
      agencyId: 'a-7',
    });
    const p = pedidos[0]!;
    expect(p.ruta).toBe('/rest/v1/plans');
    expect(p.params).toMatchObject({
      estado: ['eq.publicado'],
      busqueda: ['ilike.%guatape%'],
      categoria: ['eq.gastronomia'],
      destino: ['eq.Jericó'],
      precio_cop: ['lte.250000'],
      agency_id: ['eq.a-7'],
      'plan_dates.order': ['fecha.asc'],
      order: ['precio_cop.desc'],
    });
  });

  test.each([
    [OrdenCatalogo.rating, 'rating_promedio.desc'],
    [OrdenCatalogo.precioAsc, 'precio_cop.asc'],
    [OrdenCatalogo.precioDesc, 'precio_cop.desc'],
    [OrdenCatalogo.recientes, 'created_at.desc'],
  ])('orden %s → %s', async (orden, esperado) => {
    const { client, pedidos } = crearSupabaseFalso();
    await new CatalogApiSupabase({ client }).planesPublicados({ desde: '2026-11-02', orden });
    expect(pedidos[0]!.params['order']).toEqual([esperado]);
  });

  test('agencias_publicas sin y con agencia', async () => {
    const { client, pedidos } = crearSupabaseFalso(() => ({ cuerpo: [{ id: 'a' }] }));
    const api = new CatalogApiSupabase({ client });
    expect(await api.agenciasPublicas()).toEqual([{ id: 'a' }]);
    await api.agenciasPublicas({ agencyId: 'a-1' });
    expect(pedidos.map((p) => [p.metodo, p.ruta, p.cuerpo])).toEqual([
      ['POST', '/rest/v1/rpc/agencias_publicas', {}],
      ['POST', '/rest/v1/rpc/agencias_publicas', { p_agency_id: 'a-1' }],
    ]);
  });

  test('plan: un solo objeto con sus fechas desde hoy; destinos: solo la columna, ordenada', async () => {
    const { client, pedidos } = crearSupabaseFalso((p) =>
      p.params['id'] ? { cuerpo: { id: 'p-9' } } : { cuerpo: [{ destino: 'Jericó' }] },
    );
    const api = new CatalogApiSupabase({ client });
    expect(await api.plan('p-9', { desde: '2026-11-02' })).toEqual({ id: 'p-9' });
    expect(pedidos[0]!.params).toMatchObject({
      select: ['*,agencies(*),plan_dates(*)'],
      id: ['eq.p-9'],
      'plan_dates.fecha': ['gte.2026-11-02'],
      'plan_dates.order': ['fecha.asc'],
    });
    expect(pedidos[0]!.headers['accept']).toContain('vnd.pgrst.object');
    expect(await api.destinosPublicados()).toEqual([{ destino: 'Jericó' }]);
    expect(pedidos[1]!.params).toMatchObject({
      select: ['destino'],
      estado: ['eq.publicado'],
      order: ['destino.asc'],
    });
  });

  test('un error de PostgREST se lanza (no se devuelve en {error})', async () => {
    const { client } = crearSupabaseFalso(() => ({
      status: 406,
      cuerpo: { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned', details: null, hint: null },
    }));
    await expect(new CatalogApiSupabase({ client }).plan('nada', { desde: '2026-11-02' })).rejects.toMatchObject({
      code: 'PGRST116',
    });
  });
});
