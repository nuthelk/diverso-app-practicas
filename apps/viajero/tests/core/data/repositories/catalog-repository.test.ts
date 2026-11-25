import { CatalogRepository } from '@/core/data/repositories/catalog-repository';
import type { CatalogApi, ParametrosPlanes } from '@/core/data/services/catalog-api';
import { ExperienceCategory } from '@/core/models/enums';
import type { Row } from '@/core/models/row';
import { CatalogSort } from '@/core/models/catalog-filters';
import { localDate, dateToIso } from '@/core/utils/dates';
import { todayInBogota } from '@/core/utils/bogota-time';

/** Api falsa del catálogo: devuelve las filas indicadas y guarda con qué filtros se le pidió. */
class CatalogApiFalsa implements CatalogApi {
  planes: Row[] = [];
  agencias: Row[] = [];
  filaPlan: Row = {};
  destinos: Row[] = [];

  ultimaBusqueda: ParametrosPlanes | null = null;
  readonly agenciasPedidas: (string | null)[] = [];
  ultimoDetalle: { planId: string; desde: string } | null = null;

  async planesPublicados(p: ParametrosPlanes) {
    this.ultimaBusqueda = p;
    return this.planes;
  }
  async agenciasPublicas({ agencyId = null }: { agencyId?: string | null } = {}) {
    this.agenciasPedidas.push(agencyId);
    return this.agencias;
  }
  async plan(planId: string, { desde }: { desde: string }) {
    this.ultimoDetalle = { planId, desde };
    return this.filaPlan;
  }
  async destinosPublicados() {
    return this.destinos;
  }
}

/** Plan con una sola fecha. `hora` es la `hora_salida` (hora de Bogotá) de todas sus fechas. */
const plan = (id: string, { fecha, cupos = 5, hora = '06:00:00' }: { fecha: Date; cupos?: number; hora?: string }): Row => ({
  id,
  agency_id: 'a-1',
  titulo: `Plan ${id}`,
  destino: 'Jericó',
  precio_cop: 100000,
  hora_salida: hora,
  plan_dates: [
    { id: `pd-${id}`, plan_id: id, fecha: dateToIso(fecha), cupo_total: 10, cupo_disponible: cupos },
  ],
});

const agencia = (id: string): Row => ({ id, nombre: `Agencia ${id}` });

const hoy = todayInBogota();
const enTresDias = localDate(hoy.getFullYear(), hoy.getMonth() + 1, hoy.getDate() + 3);
const enCuatroDias = localDate(hoy.getFullYear(), hoy.getMonth() + 1, hoy.getDate() + 4);

describe('search: lo que se le pide a la Api', () => {
  test('sin filtros: desde hoy (Bogotá), orden por puntaje y nada más', async () => {
    const api = new CatalogApiFalsa();
    await new CatalogRepository({ api }).search({});
    expect(api.ultimaBusqueda).toStrictEqual({
      desde: dateToIso(hoy),
      orden: CatalogSort.rating,
      busqueda: null,
      categoria: null,
      destino: null,
      precioMax: null,
      fecha: null,
      agencyId: null,
    });
  });

  test('búsqueda de texto: minúsculas, sin tildes ni comodines', async () => {
    const api = new CatalogApiFalsa();
    const repo = new CatalogRepository({ api });
    await repo.search({ text: '  Guatapé  % PiedraL ' });
    expect(api.ultimaBusqueda!.busqueda).toBe('guatape piedral');
    await repo.search({ text: '   ' });
    expect(api.ultimaBusqueda!.busqueda).toBeNull();
  });

  test('categoría, destino, precio máximo, agencia y orden pasan tal cual', async () => {
    const api = new CatalogApiFalsa();
    await new CatalogRepository({ api }).search({
      category: ExperienceCategory.gastronomy,
      destination: 'Jericó',
      maxPrice: 250000,
      agencyId: 'a-7',
      sort: CatalogSort.priceDesc,
    });
    expect(api.ultimaBusqueda).toMatchObject({
      categoria: ExperienceCategory.gastronomy,
      destino: 'Jericó',
      precioMax: 250000,
      agencyId: 'a-7',
      orden: CatalogSort.priceDesc,
    });
  });

  test('un destino vacío no filtra', async () => {
    const api = new CatalogApiFalsa();
    await new CatalogRepository({ api }).search({ destination: '' });
    expect(api.ultimaBusqueda!.destino).toBeNull();
  });

  test('la fecha elegida viaja como YYYY-MM-DD', async () => {
    const api = new CatalogApiFalsa();
    await new CatalogRepository({ api }).search({ date: enTresDias });
    expect(api.ultimaBusqueda!.fecha).toBe(dateToIso(enTresDias));
  });
});

describe('search: filtro de fecha (bug L)', () => {
  test('sin fecha elegida devuelve todos los planes, en el orden que dio la Api', async () => {
    const api = new CatalogApiFalsa();
    api.planes = [plan('p1', { fecha: enCuatroDias }), plan('p2', { fecha: enTresDias, cupos: 0 })];
    const r = await new CatalogRepository({ api }).search({});
    expect(r.map((p) => p.id)).toEqual(['p1', 'p2']);
  });

  test('con fecha: solo planes con una salida por partir ese día, y con cupos', async () => {
    const api = new CatalogApiFalsa();
    api.planes = [
      plan('sale', { fecha: enTresDias }),
      plan('otro-dia', { fecha: enCuatroDias }),
      plan('agotado', { fecha: enTresDias, cupos: 0 }),
    ];
    const r = await new CatalogRepository({ api }).search({ date: enTresDias });
    expect(r.map((p) => p.id)).toEqual(['sale']);
  });

  test('hoy, una salida que ya partió no cuenta (aunque tenga cupos)', async () => {
    const api = new CatalogApiFalsa();
    api.planes = [plan('ya-salio', { fecha: hoy, hora: '00:00:00' })];
    const r = await new CatalogRepository({ api }).search({ date: hoy });
    expect(r).toEqual([]);
  });
});

describe('agencias, detalle y destinos', () => {
  test('agencias: una AgenciaResumen por fila', async () => {
    const api = new CatalogApiFalsa();
    api.agencias = [agencia('a1'), agencia('a2')];
    const r = await new CatalogRepository({ api }).agencias();
    expect(r.map((a) => a.name)).toEqual(['Agencia a1', 'Agencia a2']);
    expect(api.agenciasPedidas).toEqual([null]);
  });

  test('agenciaConPlanes: null si la agencia no existe o no está habilitada', async () => {
    const api = new CatalogApiFalsa();
    expect(await new CatalogRepository({ api }).agenciaConPlanes('a-1')).toBeNull();
  });

  test('agenciaConPlanes: la agencia y sus planes, ambos filtrados por su id', async () => {
    const api = new CatalogApiFalsa();
    api.agencias = [agencia('a-1')];
    api.planes = [plan('p1', { fecha: enTresDias })];
    const r = await new CatalogRepository({ api }).agenciaConPlanes('a-1');
    expect(r!.agencia.id).toBe('a-1');
    expect(r!.planes.map((p) => p.id)).toEqual(['p1']);
    expect(api.agenciasPedidas).toEqual(['a-1']);
    expect(api.ultimaBusqueda).toMatchObject({ agencyId: 'a-1' });
  });

  test('planDetalle: pide el plan con las fechas desde hoy (Bogotá)', async () => {
    const api = new CatalogApiFalsa();
    api.filaPlan = plan('p9', { fecha: enTresDias });
    const p = await new CatalogRepository({ api }).planDetalle('p9');
    expect(p.id).toBe('p9');
    expect(api.ultimoDetalle).toEqual({ planId: 'p9', desde: dateToIso(hoy) });
  });

  test('destinos: sin repetidos y ordenados', async () => {
    const api = new CatalogApiFalsa();
    api.destinos = [{ destino: 'Jericó' }, { destino: 'Guatapé' }, { destino: 'Jericó' }];
    expect(await new CatalogRepository({ api }).destinos()).toEqual(['Guatapé', 'Jericó']);
  });
});
