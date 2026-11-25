import type { ExperienceCategory } from './enums';

/** Orden del catálogo (solo cliente). */
export const OrdenCatalogo = {
  rating: 'rating',
  precioAsc: 'precioAsc',
  precioDesc: 'precioDesc',
  recientes: 'recientes',
} as const;
export type OrdenCatalogo = (typeof OrdenCatalogo)[keyof typeof OrdenCatalogo];

/** Filtros del buscador del catálogo. Sin lógica; null/ausente = sin filtro. */
export interface FiltrosCatalogo {
  readonly texto?: string | null;
  readonly categoria?: ExperienceCategory | null;
  readonly destino?: string | null;
  readonly precioMax?: number | null;
  /** Día elegido (se usan sus campos locales). */
  readonly fecha?: Date | null;
  /** Solo los planes de esta agencia (página de agencia). */
  readonly agencyId?: string | null;
  /** Por defecto `rating`. */
  readonly orden?: OrdenCatalogo;
}
