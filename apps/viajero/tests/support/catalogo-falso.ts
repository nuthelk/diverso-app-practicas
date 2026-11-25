import {
  AgencySummary,
  ExperienceCategory,
  Plan,
  PlanDate,
  PlanStatus,
  type CatalogRepository,
  type CatalogFilters,
  type Public,
  type Review,
  type ReviewRepository,
} from '@/core';

import type { Compuerta } from './compuerta';

/**
 * `CatalogRepository` sin Supabase para pruebas del catálogo, el comparador, la ficha y las
 * agencias (`catalogo_falso.dart`). Registra cada consulta y puede fallar o quedar en espera.
 */
export class CatalogoFalso implements Public<CatalogRepository> {
  planes: Plan[];
  destinosDisponibles: string[];
  readonly detalles: Map<string, Plan>;
  agenciasPublicas: AgencySummary[];
  readonly planesPorAgencia: Map<string, Plan[]>;

  /** Si no es null, todas las consultas lo lanzan. */
  fallo: unknown = null;
  /** Si no es null, las consultas esperan a que se complete (respuestas tardías). */
  compuerta: Compuerta | null = null;

  /** Un registro por cada llamada a `search`, en orden. */
  readonly busquedas: CatalogFilters[] = [];
  consultasDestinos = 0;
  readonly detallesPedidos: string[] = [];
  consultasAgencias = 0;
  readonly agenciasPedidas: string[] = [];

  constructor({
    planes = [],
    destinosDisponibles = [],
    detalles = {},
    agenciasPublicas = [],
    planesPorAgencia = {},
  }: {
    planes?: Plan[];
    destinosDisponibles?: string[];
    detalles?: Record<string, Plan>;
    agenciasPublicas?: AgencySummary[];
    planesPorAgencia?: Record<string, Plan[]>;
  } = {}) {
    this.planes = planes;
    this.destinosDisponibles = destinosDisponibles;
    this.detalles = new Map(Object.entries(detalles));
    this.agenciasPublicas = agenciasPublicas;
    this.planesPorAgencia = new Map(Object.entries(planesPorAgencia));
  }

  private async esperar(): Promise<void> {
    if (this.compuerta) await this.compuerta.promesa;
    if (this.fallo !== null) throw this.fallo;
  }

  async search(filtros: CatalogFilters = {}): Promise<Plan[]> {
    this.busquedas.push(filtros);
    await this.esperar();
    return this.planes;
  }

  async destinations(): Promise<string[]> {
    this.consultasDestinos++;
    await this.esperar();
    return this.destinosDisponibles;
  }

  async planDetail(planId: string): Promise<Plan> {
    this.detallesPedidos.push(planId);
    await this.esperar();
    const plan = this.detalles.get(planId);
    if (!plan) throw new Error(`Plan ${planId} no existe en el doble`);
    return plan;
  }

  async agencies(): Promise<AgencySummary[]> {
    this.consultasAgencias++;
    await this.esperar();
    return this.agenciasPublicas;
  }

  /** Null si la agencia no está en `agenciasPublicas` (no existe o no está habilitada). */
  async agencyWithPlans(agencyId: string): Promise<{ agency: AgencySummary; plans: Plan[] } | null> {
    this.agenciasPedidas.push(agencyId);
    await this.esperar();
    const agencia = this.agenciasPublicas.find((a) => a.id === agencyId);
    return agencia ? { agency: agencia, plans: this.planesPorAgencia.get(agencyId) ?? [] } : null;
  }
}

/** `ReviewRepository` sin Supabase: devuelve las reseñas dadas (o lanza `fallo`). */
export class ResenasFalsas implements Pick<Public<ReviewRepository>, 'byPlan'> {
  resenas: Review[];
  fallo: unknown = null;
  readonly pedidas: string[] = [];
  readonly limites: number[] = [];

  constructor(resenas: Review[] = []) {
    this.resenas = resenas;
  }

  async byPlan(planId: string, { limit = 20 }: { limit?: number } = {}): Promise<Review[]> {
    this.pedidas.push(planId);
    this.limites.push(limit);
    if (this.fallo !== null) throw this.fallo;
    return this.resenas;
  }
}

/** Fecha de hoy + [dias] a medianoche local (como `DateTime.now().add(days)` en los tests Dart). */
function enDias(dias: number): Date {
  const hoy = new Date();
  return new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + dias);
}

export function planDePrueba({
  id = 'plan-1',
  titulo = 'Santa Fe termal',
  dates = [],
  reviewsCount = 0,
}: { id?: string; titulo?: string; dates?: PlanDate[]; reviewsCount?: number } = {}): Plan {
  return new Plan({
    id,
    agencyId: 'ag-1',
    title: titulo,
    destination: 'Santa Fe de Antioquia',
    category: ExperienceCategory.culture,
    priceCop: 178000,
    status: PlanStatus.published,
    reviewsCount,
    dates,
  });
}

export function fechaDePrueba(id: string, { dias = 3, cupos = 10 }: { dias?: number; cupos?: number } = {}): PlanDate {
  return new PlanDate({ id, planId: 'plan-1', date: enDias(dias), totalSpots: 20, availableSpots: cupos });
}
