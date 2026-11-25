import { AgencySummary } from '../../models/agency-summary';
import { asString } from '../../models/row';
import { type CatalogFilters, CatalogSort } from '../../models/catalog-filters';
import { Plan } from '../../models/plan';
import { normalizeSearch } from '../../utils/search';
import { dateToIso } from '../../utils/dates';
import { todayInBogota } from '../../utils/bogota-time';
import type { CatalogApi } from '../services/catalog-api';

/** Catálogo público. NO traduce errores: salen crudos de PostgREST (como en Dart). */
export class CatalogRepository {
  private readonly api: CatalogApi;

  constructor({ api }: { api: CatalogApi }) {
    this.api = api;
  }

  /**
   * Planes publicados con su agencia y próximas fechas, aplicando filtros. Con una fecha elegida,
   * solo los planes que ese día aún tengan una salida por partir (y con cupos). Mantiene el orden
   * del servidor.
   */
  async search(filters: CatalogFilters = {}): Promise<Plan[]> {
    const searchText = normalizeSearch(filters.text ?? '');
    const destination = filters.destination ?? null;
    const day = filters.date ?? null;
    const rows = await this.api.publishedPlans({
      // Las reservas vencidas se liberan en el servidor (pg_cron cada 5 min).
      from: dateToIso(todayInBogota()),
      sort: filters.sort ?? CatalogSort.rating,
      search: searchText === '' ? null : searchText,
      category: filters.category ?? null,
      destination: destination === null || destination === '' ? null : destination,
      maxPrice: filters.maxPrice ?? null,
      date: day === null ? null : dateToIso(day),
      agencyId: filters.agencyId ?? null,
    });
    const plans = rows.map(Plan.fromMap);
    return day === null ? plans : plans.filter((p) => p.hasDepartureOn(day));
  }

  /** Agencias con planes publicados (función `agencias_publicas`: solo columnas públicas y agregados). */
  async agencies(): Promise<AgencySummary[]> {
    return (await this.api.publicAgencies()).map(AgencySummary.fromMap);
  }

  /**
   * Una agencia y sus planes publicados (misma consulta y modelo que el catálogo), pedidos en
   * paralelo. Null si no existe o no está habilitada.
   */
  async agencyWithPlans(agencyId: string): Promise<{ agency: AgencySummary; plans: Plan[] } | null> {
    const [rows, plans] = await Promise.all([
      this.api.publicAgencies({ agencyId }),
      this.search({ agencyId }),
    ]);
    if (rows.length === 0) return null;
    return { agency: AgencySummary.fromMap(rows[0]!), plans };
  }

  /** Ficha del plan con sus fechas desde hoy (Bogotá). Falla si no existe. */
  async planDetail(planId: string): Promise<Plan> {
    return Plan.fromMap(await this.api.plan(planId, { from: dateToIso(todayInBogota()) }));
  }

  /**
   * Destinos distintos con planes publicados (para el filtro), ordenados por unidades de código
   * como `List.sort()` de Dart (no por locale: «Ánimas» quedaría al final).
   */
  async destinations(): Promise<string[]> {
    const rows = await this.api.publishedDestinations();
    return [...new Set(rows.map((e) => asString(e['destino'])))].sort();
  }
}
