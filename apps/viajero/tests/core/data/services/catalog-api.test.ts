import { CatalogApiSupabase } from '@/core/data/services/catalog-api';
import { ExperienceCategory } from '@/core/models/enums';
import { CatalogSort } from '@/core/models/catalog-filters';

import { createFakeSupabase } from '../../../support/fake-supabase';

/**
 * La consulta que `CatalogApi` le manda a PostgREST, vista en un fetch falso que contesta `[]`:
 * el filtro por día debe actuar sobre los planes (antes del límite de 60), no solo sobre las
 * fechas embebidas.
 */
async function query(extra: { date?: string } = {}) {
  const { client, requests } = createFakeSupabase();
  await new CatalogApiSupabase({ client }).publishedPlans({
    from: '2026-11-02',
    sort: CatalogSort.rating,
    ...extra,
  });
  expect(requests).toHaveLength(1);
  return requests[0]!.params;
}

test('con día elegido: unión interna con plan_dates y filtro de ese día en la consulta', async () => {
  const q = await query({ date: '2026-11-05' });
  expect(q['select']).toEqual(['*,agencies(*),plan_dates!inner(*)']);
  expect(q['plan_dates.fecha']).toEqual(expect.arrayContaining(['eq.2026-11-05', 'gte.2026-11-02']));
  expect(q['limit']).toEqual(['60']);
});

test('sin día elegido: la consulta de siempre, con plan_dates opcional', async () => {
  const q = await query();
  expect(q['select']).toEqual(['*,agencies(*),plan_dates(*)']);
  expect(q['plan_dates.fecha']).toEqual(['gte.2026-11-02']);
  expect(q['limit']).toEqual(['60']);
});

describe('CatalogApiSupabase (extra del port)', () => {
  test('todos los filtros y el orden embebido de las fechas', async () => {
    const { client, requests } = createFakeSupabase();
    await new CatalogApiSupabase({ client }).publishedPlans({
      from: '2026-11-02',
      sort: CatalogSort.priceDesc,
      search: 'guatape',
      category: ExperienceCategory.gastronomy,
      destination: 'Jericó',
      maxPrice: 250000,
      agencyId: 'a-7',
    });
    const p = requests[0]!;
    expect(p.path).toBe('/rest/v1/plans');
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
    [CatalogSort.rating, 'rating_promedio.desc'],
    [CatalogSort.priceAsc, 'precio_cop.asc'],
    [CatalogSort.priceDesc, 'precio_cop.desc'],
    [CatalogSort.newest, 'created_at.desc'],
  ])('orden %s → %s', async (sort, expected) => {
    const { client, requests } = createFakeSupabase();
    await new CatalogApiSupabase({ client }).publishedPlans({ from: '2026-11-02', sort });
    expect(requests[0]!.params['order']).toEqual([expected]);
  });

  test('agencias_publicas sin y con agencia', async () => {
    const { client, requests } = createFakeSupabase(() => ({ body: [{ id: 'a' }] }));
    const api = new CatalogApiSupabase({ client });
    expect(await api.publicAgencies()).toEqual([{ id: 'a' }]);
    await api.publicAgencies({ agencyId: 'a-1' });
    expect(requests.map((p) => [p.method, p.path, p.body])).toEqual([
      ['POST', '/rest/v1/rpc/agencias_publicas', {}],
      ['POST', '/rest/v1/rpc/agencias_publicas', { p_agency_id: 'a-1' }],
    ]);
  });

  test('plan: un solo objeto con sus fechas desde hoy; destinos: solo la columna, ordenada', async () => {
    const { client, requests } = createFakeSupabase((p) =>
      p.params['id'] ? { body: { id: 'p-9' } } : { body: [{ destino: 'Jericó' }] },
    );
    const api = new CatalogApiSupabase({ client });
    expect(await api.plan('p-9', { from: '2026-11-02' })).toEqual({ id: 'p-9' });
    expect(requests[0]!.params).toMatchObject({
      select: ['*,agencies(*),plan_dates(*)'],
      id: ['eq.p-9'],
      'plan_dates.fecha': ['gte.2026-11-02'],
      'plan_dates.order': ['fecha.asc'],
    });
    expect(requests[0]!.headers['accept']).toContain('vnd.pgrst.object');
    expect(await api.publishedDestinations()).toEqual([{ destino: 'Jericó' }]);
    expect(requests[1]!.params).toMatchObject({
      select: ['destino'],
      estado: ['eq.publicado'],
      order: ['destino.asc'],
    });
  });

  test('un error de PostgREST se lanza (no se devuelve en {error})', async () => {
    const { client } = createFakeSupabase(() => ({
      status: 406,
      body: { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned', details: null, hint: null },
    }));
    await expect(new CatalogApiSupabase({ client }).plan('nada', { from: '2026-11-02' })).rejects.toMatchObject({
      code: 'PGRST116',
    });
  });
});
