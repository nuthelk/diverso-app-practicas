import type { SupabaseClient } from '@supabase/supabase-js';

import { type ExperienceCategory, PlanStatus } from '../../models/enums';
import type { Row } from '../../models/row';
import { CatalogSort } from '../../models/catalog-filters';

const PLAN_SELECT = '*, agencies(*), plan_dates(*)';

/**
 * Con un día elegido la unión con `plan_dates` es interna (`!inner`): los filtros sobre
 * `plan_dates.fecha` descartan planes y no solo fechas, así el límite de 60 se aplica a los planes
 * que sí tienen ese día.
 */
const PLAN_SELECT_WITH_DAY = '*, agencies(*), plan_dates!inner(*)';

/** Filtros de `publishedPlans`; null/ausente = sin filtro. */
export interface PlanQueryParams {
  /** YYYY-MM-DD: solo fechas embebidas desde este día. */
  from: string;
  sort: CatalogSort;
  /** Ya normalizada (minúsculas y sin tildes). */
  search?: string | null;
  category?: ExperienceCategory | null;
  destination?: string | null;
  maxPrice?: number | null;
  /** YYYY-MM-DD. */
  date?: string | null;
  agencyId?: string | null;
}

/** Acceso crudo al catálogo público en Supabase: devuelve filas y LANZA los errores de PostgREST. */
export interface CatalogApi {
  /** Planes publicados con su agencia y las fechas desde `from`, aplicando los filtros que no sean null. */
  publishedPlans(p: PlanQueryParams): Promise<Row[]>;
  /** `agencias_publicas`: solo columnas públicas y agregados; con `agencyId`, solo esa agencia. */
  publicAgencies(options?: { agencyId?: string | null }): Promise<Row[]>;
  /** Un plan con su agencia y las fechas desde `from`; falla (PGRST116) si no existe. */
  plan(planId: string, options: { from: string }): Promise<Row>;
  /** `destino` de cada plan publicado (con repeticiones). */
  publishedDestinations(): Promise<Row[]>;
}

const SORT_COLUMNS: Record<CatalogSort, { column: string; ascending: boolean }> = {
  [CatalogSort.rating]: { column: 'rating_promedio', ascending: false },
  [CatalogSort.priceAsc]: { column: 'precio_cop', ascending: true },
  [CatalogSort.priceDesc]: { column: 'precio_cop', ascending: false },
  [CatalogSort.newest]: { column: 'created_at', ascending: false },
};

export class CatalogApiSupabase implements CatalogApi {
  private readonly client: SupabaseClient;

  constructor({ client }: { client: SupabaseClient }) {
    this.client = client;
  }

  async publishedPlans(p: PlanQueryParams): Promise<Row[]> {
    // Filtros primero; orden y límite al final.
    let query = this.client
      .from('plans')
      .select(p.date == null ? PLAN_SELECT : PLAN_SELECT_WITH_DAY)
      .eq('estado', PlanStatus.published)
      // Sin `!inner` filtra las fechas embebidas, no los planes.
      .gte('plan_dates.fecha', p.from);

    // Un solo ilike sobre la columna generada `plans.busqueda` (0011: minúsculas y sin tildes).
    if (p.search != null) query = query.ilike('busqueda', `%${p.search}%`);
    if (p.category != null) query = query.eq('categoria', p.category);
    if (p.destination != null) query = query.eq('destino', p.destination);
    if (p.maxPrice != null) query = query.lte('precio_cop', p.maxPrice);
    if (p.date != null) query = query.eq('plan_dates.fecha', p.date);
    if (p.agencyId != null) query = query.eq('agency_id', p.agencyId);

    const { column, ascending } = SORT_COLUMNS[p.sort];
    const { data } = await query
      .order('fecha', { ascending: true, referencedTable: 'plan_dates' })
      .order(column, { ascending })
      .limit(60)
      .throwOnError();
    return data as unknown as Row[];
  }

  async publicAgencies({ agencyId = null }: { agencyId?: string | null } = {}): Promise<Row[]> {
    const { data } = await (agencyId == null
      ? this.client.rpc('agencias_publicas')
      : this.client.rpc('agencias_publicas', { p_agency_id: agencyId })
    ).throwOnError();
    return data as Row[];
  }

  async plan(planId: string, { from }: { from: string }): Promise<Row> {
    const { data } = await this.client
      .from('plans')
      .select(PLAN_SELECT)
      .eq('id', planId)
      .gte('plan_dates.fecha', from)
      .order('fecha', { ascending: true, referencedTable: 'plan_dates' })
      .single()
      .throwOnError();
    return data as Row;
  }

  async publishedDestinations(): Promise<Row[]> {
    const { data } = await this.client
      .from('plans')
      .select('destino')
      .eq('estado', PlanStatus.published)
      .order('destino')
      .throwOnError();
    return data as Row[];
  }
}
