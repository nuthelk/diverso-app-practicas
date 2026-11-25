import { AgenciaResumen } from '../../models/agencia-resumen';
import { texto } from '../../models/fila';
import { type FiltrosCatalogo, OrdenCatalogo } from '../../models/filtros-catalogo';
import { Plan } from '../../models/plan';
import { normalizarBusqueda } from '../../utils/busqueda';
import { fechaToIso } from '../../utils/fechas';
import { hoyBogota } from '../../utils/hora-bogota';
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
  async search(filtros: FiltrosCatalogo = {}): Promise<Plan[]> {
    const busqueda = normalizarBusqueda(filtros.texto ?? '');
    const destino = filtros.destino ?? null;
    const dia = filtros.fecha ?? null;
    const filas = await this.api.planesPublicados({
      // Las reservas vencidas se liberan en el servidor (pg_cron cada 5 min).
      desde: fechaToIso(hoyBogota()),
      orden: filtros.orden ?? OrdenCatalogo.rating,
      busqueda: busqueda === '' ? null : busqueda,
      categoria: filtros.categoria ?? null,
      destino: destino === null || destino === '' ? null : destino,
      precioMax: filtros.precioMax ?? null,
      fecha: dia === null ? null : fechaToIso(dia),
      agencyId: filtros.agencyId ?? null,
    });
    const planes = filas.map(Plan.fromMap);
    return dia === null ? planes : planes.filter((p) => p.tieneSalidaEl(dia));
  }

  /** Agencias con planes publicados (función `agencias_publicas`: solo columnas públicas y agregados). */
  async agencias(): Promise<AgenciaResumen[]> {
    return (await this.api.agenciasPublicas()).map(AgenciaResumen.fromMap);
  }

  /**
   * Una agencia y sus planes publicados (misma consulta y modelo que el catálogo), pedidos en
   * paralelo. Null si no existe o no está habilitada.
   */
  async agenciaConPlanes(agencyId: string): Promise<{ agencia: AgenciaResumen; planes: Plan[] } | null> {
    const [filas, planes] = await Promise.all([
      this.api.agenciasPublicas({ agencyId }),
      this.search({ agencyId }),
    ]);
    if (filas.length === 0) return null;
    return { agencia: AgenciaResumen.fromMap(filas[0]!), planes };
  }

  /** Ficha del plan con sus fechas desde hoy (Bogotá). Falla si no existe. */
  async planDetalle(planId: string): Promise<Plan> {
    return Plan.fromMap(await this.api.plan(planId, { desde: fechaToIso(hoyBogota()) }));
  }

  /**
   * Destinos distintos con planes publicados (para el filtro), ordenados por unidades de código
   * como `List.sort()` de Dart (no por locale: «Ánimas» quedaría al final).
   */
  async destinos(): Promise<string[]> {
    const filas = await this.api.destinosPublicados();
    return [...new Set(filas.map((e) => texto(e['destino'])))].sort();
  }
}
