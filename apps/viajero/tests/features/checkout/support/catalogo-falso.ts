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
 * [CatalogRepository] sin Supabase, solo con `planDetalle` (lo único que usa el checkout; port de
 * la parte de `catalogo_falso.dart` que tocan sus pruebas).
 */
export class CatalogoFalso implements Pick<Public<CatalogRepository>, 'planDetail'> {
  readonly detalles: Map<string, Plan>;

  /** Si no es null, `planDetalle` lo lanza. */
  fallo: unknown = null;

  /** Si no es null, `planDetalle` espera a que se complete (respuestas tardías). */
  compuerta: Compuerta | null = null;

  readonly detallesPedidos: string[] = [];

  constructor({ detalles = {} }: { detalles?: Record<string, Plan> } = {}) {
    this.detalles = new Map(Object.entries(detalles));
  }

  async planDetail(planId: string): Promise<Plan> {
    this.detallesPedidos.push(planId);
    await this.compuerta?.promesa;
    if (this.fallo !== null) throw this.fallo;
    const plan = this.detalles.get(planId);
    if (!plan) throw new DiversoError('PLAN_NO_PUBLICADO');
    return plan;
  }
}

const DIA_MS = 24 * 3600 * 1000;

/** Fecha `id` del plan de prueba a [dias] días de hoy (medianoche local). */
export function fechaDePrueba(id = 'fecha-1', { dias = 20, cupos = 8 }: { dias?: number; cupos?: number } = {}): PlanDate {
  const hoy = new Date();
  const dia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  return new PlanDate({
    id,
    planId: 'plan-1',
    date: new Date(dia.getTime() + dias * DIA_MS),
    totalSpots: 10,
    availableSpots: cupos,
  });
}

/** «Guatapé en un día» (`plan-1`), 150 000 por persona. */
export function planDePrueba({
  fechas = [fechaDePrueba()],
  puntoEncuentro,
  itinerario,
  fotos,
}: {
  fechas?: PlanDate[];
  puntoEncuentro?: string;
  itinerario?: ItineraryStep[];
  fotos?: string[];
} = {}): Plan {
  return new Plan({
    id: 'plan-1',
    agencyId: 'ag-1',
    title: 'Guatapé en un día',
    destination: 'Guatapé',
    category: ExperienceCategory.adventure,
    priceCop: 150000,
    status: PlanStatus.published,
    meetingPoint: puntoEncuentro,
    itinerary: itinerario,
    photos: fotos,
    dates: fechas,
  });
}
