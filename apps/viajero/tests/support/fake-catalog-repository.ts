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

import type { Gate } from './gate';

/**
 * `CatalogRepository` sin Supabase para pruebas del catálogo, el comparador, la ficha y las
 * agencias (`catalogo_falso.dart`). Registra cada consulta y puede fallar o quedar en espera.
 */
export class FakeCatalogRepository implements Public<CatalogRepository> {
  plans: Plan[];
  availableDestinations: string[];
  readonly details: Map<string, Plan>;
  publicAgencies: AgencySummary[];
  readonly plansByAgency: Map<string, Plan[]>;

  /** Si no es null, todas las consultas lo lanzan. */
  failure: unknown = null;
  /** Si no es null, las consultas esperan a que se complete (respuestas tardías). */
  gate: Gate | null = null;

  /** Un registro por cada llamada a `search`, en orden. */
  readonly searches: CatalogFilters[] = [];
  destinationQueries = 0;
  readonly requestedPlanIds: string[] = [];
  agencyQueries = 0;
  readonly requestedAgencyIds: string[] = [];

  constructor({
    plans = [],
    availableDestinations = [],
    details = {},
    publicAgencies = [],
    plansByAgency = {},
  }: {
    plans?: Plan[];
    availableDestinations?: string[];
    details?: Record<string, Plan>;
    publicAgencies?: AgencySummary[];
    plansByAgency?: Record<string, Plan[]>;
  } = {}) {
    this.plans = plans;
    this.availableDestinations = availableDestinations;
    this.details = new Map(Object.entries(details));
    this.publicAgencies = publicAgencies;
    this.plansByAgency = new Map(Object.entries(plansByAgency));
  }

  private async awaitGate(): Promise<void> {
    if (this.gate) await this.gate.promise;
    if (this.failure !== null) throw this.failure;
  }

  async search(filters: CatalogFilters = {}): Promise<Plan[]> {
    this.searches.push(filters);
    await this.awaitGate();
    return this.plans;
  }

  async destinations(): Promise<string[]> {
    this.destinationQueries++;
    await this.awaitGate();
    return this.availableDestinations;
  }

  async planDetail(planId: string): Promise<Plan> {
    this.requestedPlanIds.push(planId);
    await this.awaitGate();
    const plan = this.details.get(planId);
    if (!plan) throw new Error(`Plan ${planId} no existe en el doble`);
    return plan;
  }

  async agencies(): Promise<AgencySummary[]> {
    this.agencyQueries++;
    await this.awaitGate();
    return this.publicAgencies;
  }

  /** Null si la agencia no está en `publicAgencies` (no existe o no está habilitada). */
  async agencyWithPlans(agencyId: string): Promise<{ agency: AgencySummary; plans: Plan[] } | null> {
    this.requestedAgencyIds.push(agencyId);
    await this.awaitGate();
    const agency = this.publicAgencies.find((a) => a.id === agencyId);
    return agency ? { agency, plans: this.plansByAgency.get(agencyId) ?? [] } : null;
  }
}

/** `ReviewRepository` sin Supabase: devuelve las reseñas dadas (o lanza `failure`). */
export class FakeReviews implements Pick<Public<ReviewRepository>, 'byPlan'> {
  reviews: Review[];
  failure: unknown = null;
  readonly requestedPlanIds: string[] = [];
  readonly limits: number[] = [];

  constructor(reviews: Review[] = []) {
    this.reviews = reviews;
  }

  async byPlan(planId: string, { limit = 20 }: { limit?: number } = {}): Promise<Review[]> {
    this.requestedPlanIds.push(planId);
    this.limits.push(limit);
    if (this.failure !== null) throw this.failure;
    return this.reviews;
  }
}

/** Fecha de hoy + [days] a medianoche local (como `DateTime.now().add(days)` en los tests Dart). */
function inDays(days: number): Date {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate() + days);
}

export function testPlan({
  id = 'plan-1',
  title = 'Santa Fe termal',
  dates = [],
  reviewsCount = 0,
}: { id?: string; title?: string; dates?: PlanDate[]; reviewsCount?: number } = {}): Plan {
  return new Plan({
    id,
    agencyId: 'ag-1',
    title,
    destination: 'Santa Fe de Antioquia',
    category: ExperienceCategory.culture,
    priceCop: 178000,
    status: PlanStatus.published,
    reviewsCount,
    dates,
  });
}

export function testPlanDate(id: string, { days = 3, spots = 10 }: { days?: number; spots?: number } = {}): PlanDate {
  return new PlanDate({ id, planId: 'plan-1', date: inDays(days), totalSpots: 20, availableSpots: spots });
}
