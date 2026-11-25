import {
  AgenciaResumen,
  ExperienceCategory,
  Plan,
  PlanDate,
  PlanStatus,
  type CatalogRepository,
  type FiltrosCatalogo,
  type Publico,
  type Review,
  type ReviewRepository,
} from '@/core';

import type { Compuerta } from './compuerta';

/**
 * `CatalogRepository` sin Supabase para pruebas del catálogo, el comparador, la ficha y las
 * agencias (`catalogo_falso.dart`). Registra cada consulta y puede fallar o quedar en espera.
 */
export class CatalogoFalso implements Publico<CatalogRepository> {
  planes: Plan[];
  destinosDisponibles: string[];
  readonly detalles: Map<string, Plan>;
  agenciasPublicas: AgenciaResumen[];
  readonly planesPorAgencia: Map<string, Plan[]>;

  /** Si no es null, todas las consultas lo lanzan. */
  fallo: unknown = null;
  /** Si no es null, las consultas esperan a que se complete (respuestas tardías). */
  compuerta: Compuerta | null = null;

  /** Un registro por cada llamada a `search`, en orden. */
  readonly busquedas: FiltrosCatalogo[] = [];
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
    agenciasPublicas?: AgenciaResumen[];
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

  async search(filtros: FiltrosCatalogo = {}): Promise<Plan[]> {
    this.busquedas.push(filtros);
    await this.esperar();
    return this.planes;
  }

  async destinos(): Promise<string[]> {
    this.consultasDestinos++;
    await this.esperar();
    return this.destinosDisponibles;
  }

  async planDetalle(planId: string): Promise<Plan> {
    this.detallesPedidos.push(planId);
    await this.esperar();
    const plan = this.detalles.get(planId);
    if (!plan) throw new Error(`Plan ${planId} no existe en el doble`);
    return plan;
  }

  async agencias(): Promise<AgenciaResumen[]> {
    this.consultasAgencias++;
    await this.esperar();
    return this.agenciasPublicas;
  }

  /** Null si la agencia no está en `agenciasPublicas` (no existe o no está habilitada). */
  async agenciaConPlanes(agencyId: string): Promise<{ agencia: AgenciaResumen; planes: Plan[] } | null> {
    this.agenciasPedidas.push(agencyId);
    await this.esperar();
    const agencia = this.agenciasPublicas.find((a) => a.id === agencyId);
    return agencia ? { agencia, planes: this.planesPorAgencia.get(agencyId) ?? [] } : null;
  }
}

/** `ReviewRepository` sin Supabase: devuelve las reseñas dadas (o lanza `fallo`). */
export class ResenasFalsas implements Pick<Publico<ReviewRepository>, 'porPlan'> {
  resenas: Review[];
  fallo: unknown = null;
  readonly pedidas: string[] = [];
  readonly limites: number[] = [];

  constructor(resenas: Review[] = []) {
    this.resenas = resenas;
  }

  async porPlan(planId: string, { limit = 20 }: { limit?: number } = {}): Promise<Review[]> {
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
    titulo,
    destino: 'Santa Fe de Antioquia',
    categoria: ExperienceCategory.cultura,
    precioCop: 178000,
    estado: PlanStatus.publicado,
    reviewsCount,
    dates,
  });
}

export function fechaDePrueba(id: string, { dias = 3, cupos = 10 }: { dias?: number; cupos?: number } = {}): PlanDate {
  return new PlanDate({ id, planId: 'plan-1', fecha: enDias(dias), cupoTotal: 20, cupoDisponible: cupos });
}
