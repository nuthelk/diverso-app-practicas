import { CatalogRepository } from '@/core/data/repositories/catalog-repository';
import type { CatalogApi, PlanQueryParams } from '@/core/data/services/catalog-api';
import { ExperienceCategory } from '@/core/models/enums';
import type { Row } from '@/core/models/row';
import { CatalogSort } from '@/core/models/catalog-filters';
import { localDate, dateToIso } from '@/core/utils/dates';
import { todayInBogota } from '@/core/utils/bogota-time';

/** Api falsa del catálogo: devuelve las filas indicadas y guarda con qué filtros se le pidió. */
class FakeCatalogApi implements CatalogApi {
  plans: Row[] = [];
  agencies: Row[] = [];
  planRow: Row = {};
  destinations: Row[] = [];

  lastSearch: PlanQueryParams | null = null;
  readonly agencyRequests: (string | null)[] = [];
  lastDetail: { planId: string; from: string } | null = null;

  async publishedPlans(p: PlanQueryParams) {
    this.lastSearch = p;
    return this.plans;
  }
  async publicAgencies({ agencyId = null }: { agencyId?: string | null } = {}) {
    this.agencyRequests.push(agencyId);
    return this.agencies;
  }
  async plan(planId: string, { from }: { from: string }) {
    this.lastDetail = { planId, from };
    return this.planRow;
  }
  async publishedDestinations() {
    return this.destinations;
  }
}

/** Plan con una sola fecha. `time` es la `hora_salida` (hora de Bogotá) de todas sus fechas. */
const plan = (id: string, { date, spots = 5, time = '06:00:00' }: { date: Date; spots?: number; time?: string }): Row => ({
  id,
  agency_id: 'a-1',
  titulo: `Plan ${id}`,
  destino: 'Jericó',
  precio_cop: 100000,
  hora_salida: time,
  plan_dates: [
    { id: `pd-${id}`, plan_id: id, fecha: dateToIso(date), cupo_total: 10, cupo_disponible: spots },
  ],
});

const agency = (id: string): Row => ({ id, nombre: `Agencia ${id}` });

const today = todayInBogota();
const inThreeDays = localDate(today.getFullYear(), today.getMonth() + 1, today.getDate() + 3);
const inFourDays = localDate(today.getFullYear(), today.getMonth() + 1, today.getDate() + 4);

describe('search: lo que se le pide a la Api', () => {
  test('sin filtros: desde hoy (Bogotá), orden por puntaje y nada más', async () => {
    const api = new FakeCatalogApi();
    await new CatalogRepository({ api }).search({});
    expect(api.lastSearch).toStrictEqual({
      from: dateToIso(today),
      sort: CatalogSort.rating,
      search: null,
      category: null,
      destination: null,
      maxPrice: null,
      date: null,
      agencyId: null,
    });
  });

  test('búsqueda de texto: minúsculas, sin tildes ni comodines', async () => {
    const api = new FakeCatalogApi();
    const repo = new CatalogRepository({ api });
    await repo.search({ text: '  Guatapé  % PiedraL ' });
    expect(api.lastSearch!.search).toBe('guatape piedral');
    await repo.search({ text: '   ' });
    expect(api.lastSearch!.search).toBeNull();
  });

  test('categoría, destino, precio máximo, agencia y orden pasan tal cual', async () => {
    const api = new FakeCatalogApi();
    await new CatalogRepository({ api }).search({
      category: ExperienceCategory.gastronomy,
      destination: 'Jericó',
      maxPrice: 250000,
      agencyId: 'a-7',
      sort: CatalogSort.priceDesc,
    });
    expect(api.lastSearch).toMatchObject({
      category: ExperienceCategory.gastronomy,
      destination: 'Jericó',
      maxPrice: 250000,
      agencyId: 'a-7',
      sort: CatalogSort.priceDesc,
    });
  });

  test('un destino vacío no filtra', async () => {
    const api = new FakeCatalogApi();
    await new CatalogRepository({ api }).search({ destination: '' });
    expect(api.lastSearch!.destination).toBeNull();
  });

  test('la fecha elegida viaja como YYYY-MM-DD', async () => {
    const api = new FakeCatalogApi();
    await new CatalogRepository({ api }).search({ date: inThreeDays });
    expect(api.lastSearch!.date).toBe(dateToIso(inThreeDays));
  });
});

describe('search: filtro de fecha (bug L)', () => {
  test('sin fecha elegida devuelve todos los planes, en el orden que dio la Api', async () => {
    const api = new FakeCatalogApi();
    api.plans = [plan('p1', { date: inFourDays }), plan('p2', { date: inThreeDays, spots: 0 })];
    const r = await new CatalogRepository({ api }).search({});
    expect(r.map((p) => p.id)).toEqual(['p1', 'p2']);
  });

  test('con fecha: solo planes con una salida por partir ese día, y con cupos', async () => {
    const api = new FakeCatalogApi();
    api.plans = [
      plan('sale', { date: inThreeDays }),
      plan('otro-dia', { date: inFourDays }),
      plan('agotado', { date: inThreeDays, spots: 0 }),
    ];
    const r = await new CatalogRepository({ api }).search({ date: inThreeDays });
    expect(r.map((p) => p.id)).toEqual(['sale']);
  });

  test('hoy, una salida que ya partió no cuenta (aunque tenga cupos)', async () => {
    const api = new FakeCatalogApi();
    api.plans = [plan('ya-salio', { date: today, time: '00:00:00' })];
    const r = await new CatalogRepository({ api }).search({ date: today });
    expect(r).toEqual([]);
  });
});

describe('agencias, detalle y destinos', () => {
  test('agencias: una AgenciaResumen por fila', async () => {
    const api = new FakeCatalogApi();
    api.agencies = [agency('a1'), agency('a2')];
    const r = await new CatalogRepository({ api }).agencies();
    expect(r.map((a) => a.name)).toEqual(['Agencia a1', 'Agencia a2']);
    expect(api.agencyRequests).toEqual([null]);
  });

  test('agenciaConPlanes: null si la agencia no existe o no está habilitada', async () => {
    const api = new FakeCatalogApi();
    expect(await new CatalogRepository({ api }).agencyWithPlans('a-1')).toBeNull();
  });

  test('agenciaConPlanes: la agencia y sus planes, ambos filtrados por su id', async () => {
    const api = new FakeCatalogApi();
    api.agencies = [agency('a-1')];
    api.plans = [plan('p1', { date: inThreeDays })];
    const r = await new CatalogRepository({ api }).agencyWithPlans('a-1');
    expect(r!.agency.id).toBe('a-1');
    expect(r!.plans.map((p) => p.id)).toEqual(['p1']);
    expect(api.agencyRequests).toEqual(['a-1']);
    expect(api.lastSearch).toMatchObject({ agencyId: 'a-1' });
  });

  test('planDetalle: pide el plan con las fechas desde hoy (Bogotá)', async () => {
    const api = new FakeCatalogApi();
    api.planRow = plan('p9', { date: inThreeDays });
    const p = await new CatalogRepository({ api }).planDetail('p9');
    expect(p.id).toBe('p9');
    expect(api.lastDetail).toEqual({ planId: 'p9', from: dateToIso(today) });
  });

  test('destinos: sin repetidos y ordenados', async () => {
    const api = new FakeCatalogApi();
    api.destinations = [{ destino: 'Jericó' }, { destino: 'Guatapé' }, { destino: 'Jericó' }];
    expect(await new CatalogRepository({ api }).destinations()).toEqual(['Guatapé', 'Jericó']);
  });
});
