import type { ExperienceCategory } from './enums';

/** Orden del catálogo (solo cliente). */
export const CatalogSort = {
  rating: 'rating',
  priceAsc: 'precioAsc',
  priceDesc: 'precioDesc',
  newest: 'recientes',
} as const;
export type CatalogSort = (typeof CatalogSort)[keyof typeof CatalogSort];

/** Filtros del buscador del catálogo. Sin lógica; null/ausente = sin filtro. */
export interface CatalogFilters {
  readonly text?: string | null;
  readonly category?: ExperienceCategory | null;
  readonly destination?: string | null;
  readonly maxPrice?: number | null;
  /** Día elegido (se usan sus campos locales). */
  readonly date?: Date | null;
  /** Solo los planes de esta agencia (página de agencia). */
  readonly agencyId?: string | null;
  /** Por defecto `rating`. */
  readonly sort?: CatalogSort;
}
