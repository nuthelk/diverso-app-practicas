import {
  DiversoError,
  ExperienceCategory,
  ItineraryStep,
  Plan,
  PlanDate,
  PlanStatus,
  type CatalogRepository,
  type Public,
} from '@/core';

import type { Compuerta } from '../../../support/compuerta';

/**
 * [CatalogRepository] sin Supabase, solo con `planDetail` (lo único que usa el checkout; port de
 * la parte de `catalogo_falso.dart` que tocan sus pruebas).
 */
export class FakeCatalog implements Pick<Public<CatalogRepository>, 'planDetail'> {
  readonly details: Map<string, Plan>;

  /** Si no es null, `planDetail` lo lanza. */
  failure: unknown = null;

  /** Si no es null, `planDetail` espera a que se complete (respuestas tardías). */
  gate: Compuerta | null = null;

  readonly requestedPlanIds: string[] = [];

  constructor({ details = {} }: { details?: Record<string, Plan> } = {}) {
    this.details = new Map(Object.entries(details));
  }

  async planDetail(planId: string): Promise<Plan> {
    this.requestedPlanIds.push(planId);
    await this.gate?.promesa;
    if (this.failure !== null) throw this.failure;
    const plan = this.details.get(planId);
    if (!plan) throw new DiversoError('PLAN_NO_PUBLICADO');
    return plan;
  }
}

const DAY_MS = 24 * 3600 * 1000;

/** Fecha `id` del plan de prueba a [days] días de hoy (medianoche local). */
export function testPlanDate(id = 'fecha-1', { days = 20, spots = 8 }: { days?: number; spots?: number } = {}): PlanDate {
  const today = new Date();
  const day = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return new PlanDate({
    id,
    planId: 'plan-1',
    date: new Date(day.getTime() + days * DAY_MS),
    totalSpots: 10,
    availableSpots: spots,
  });
}

/** «Guatapé en un día» (`plan-1`), 150 000 por persona. */
export function testPlan({
  dates = [testPlanDate()],
  meetingPoint,
  itinerary,
  photos,
}: {
  dates?: PlanDate[];
  meetingPoint?: string;
  itinerary?: ItineraryStep[];
  photos?: string[];
} = {}): Plan {
  return new Plan({
    id: 'plan-1',
    agencyId: 'ag-1',
    title: 'Guatapé en un día',
    destination: 'Guatapé',
    category: ExperienceCategory.adventure,
    priceCop: 150000,
    status: PlanStatus.published,
    meetingPoint,
    itinerary,
    photos,
    dates,
  });
}
