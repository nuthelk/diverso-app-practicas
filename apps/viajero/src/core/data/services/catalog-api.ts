import type { SupabaseClient } from '@supabase/supabase-js';

import { type ExperienceCategory, PlanStatus } from '../../models/enums';
import type { Fila } from '../../models/fila';
import { OrdenCatalogo } from '../../models/filtros-catalogo';

const SELECCION_PLAN = '*, agencies(*), plan_dates(*)';

/**
 * Con un día elegido la unión con `plan_dates` es interna (`!inner`): los filtros sobre
 * `plan_dates.fecha` descartan planes y no solo fechas, así el límite de 60 se aplica a los planes
 * que sí tienen ese día.
 */
const SELECCION_PLAN_CON_DIA = '*, agencies(*), plan_dates!inner(*)';

/** Filtros de `planesPublicados`; null/ausente = sin filtro. */
export interface ParametrosPlanes {
  /** YYYY-MM-DD: solo fechas embebidas desde este día. */
  desde: string;
  orden: OrdenCatalogo;
  /** Ya normalizada (minúsculas y sin tildes). */
  busqueda?: string | null;
  categoria?: ExperienceCategory | null;
  destino?: string | null;
  precioMax?: number | null;
  /** YYYY-MM-DD. */
  fecha?: string | null;
  agencyId?: string | null;
}

/** Acceso crudo al catálogo público en Supabase: devuelve filas y LANZA los errores de PostgREST. */
export interface CatalogApi {
  /** Planes publicados con su agencia y las fechas desde `desde`, aplicando los filtros que no sean null. */
  planesPublicados(p: ParametrosPlanes): Promise<Fila[]>;
  /** `agencias_publicas`: solo columnas públicas y agregados; con `agencyId`, solo esa agencia. */
  agenciasPublicas(opciones?: { agencyId?: string | null }): Promise<Fila[]>;
  /** Un plan con su agencia y las fechas desde `desde`; falla (PGRST116) si no existe. */
  plan(planId: string, opciones: { desde: string }): Promise<Fila>;
  /** `destino` de cada plan publicado (con repeticiones). */
  destinosPublicados(): Promise<Fila[]>;
}

const ORDEN: Record<OrdenCatalogo, { columna: string; ascending: boolean }> = {
  [OrdenCatalogo.rating]: { columna: 'rating_promedio', ascending: false },
  [OrdenCatalogo.precioAsc]: { columna: 'precio_cop', ascending: true },
  [OrdenCatalogo.precioDesc]: { columna: 'precio_cop', ascending: false },
  [OrdenCatalogo.recientes]: { columna: 'created_at', ascending: false },
};

export class CatalogApiSupabase implements CatalogApi {
  private readonly client: SupabaseClient;

  constructor({ client }: { client: SupabaseClient }) {
    this.client = client;
  }

  async planesPublicados(p: ParametrosPlanes): Promise<Fila[]> {
    // Filtros primero; orden y límite al final.
    let query = this.client
      .from('plans')
      .select(p.fecha == null ? SELECCION_PLAN : SELECCION_PLAN_CON_DIA)
      .eq('estado', PlanStatus.publicado)
      // Sin `!inner` filtra las fechas embebidas, no los planes.
      .gte('plan_dates.fecha', p.desde);

    // Un solo ilike sobre la columna generada `plans.busqueda` (0011: minúsculas y sin tildes).
    if (p.busqueda != null) query = query.ilike('busqueda', `%${p.busqueda}%`);
    if (p.categoria != null) query = query.eq('categoria', p.categoria);
    if (p.destino != null) query = query.eq('destino', p.destino);
    if (p.precioMax != null) query = query.lte('precio_cop', p.precioMax);
    if (p.fecha != null) query = query.eq('plan_dates.fecha', p.fecha);
    if (p.agencyId != null) query = query.eq('agency_id', p.agencyId);

    const { columna, ascending } = ORDEN[p.orden];
    const { data } = await query
      .order('fecha', { ascending: true, referencedTable: 'plan_dates' })
      .order(columna, { ascending })
      .limit(60)
      .throwOnError();
    return data as unknown as Fila[];
  }

  async agenciasPublicas({ agencyId = null }: { agencyId?: string | null } = {}): Promise<Fila[]> {
    const { data } = await (agencyId == null
      ? this.client.rpc('agencias_publicas')
      : this.client.rpc('agencias_publicas', { p_agency_id: agencyId })
    ).throwOnError();
    return data as Fila[];
  }

  async plan(planId: string, { desde }: { desde: string }): Promise<Fila> {
    const { data } = await this.client
      .from('plans')
      .select(SELECCION_PLAN)
      .eq('id', planId)
      .gte('plan_dates.fecha', desde)
      .order('fecha', { ascending: true, referencedTable: 'plan_dates' })
      .single()
      .throwOnError();
    return data as Fila;
  }

  async destinosPublicados(): Promise<Fila[]> {
    const { data } = await this.client
      .from('plans')
      .select('destino')
      .eq('estado', PlanStatus.publicado)
      .order('destino')
      .throwOnError();
    return data as Fila[];
  }
}
