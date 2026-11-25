import { asDoubleOrNull, asIntOr, type Row, asString, asStringOr, asStringOrNull } from './row';

export interface AgencySummaryData {
  id: string;
  name: string;
  city: string;
  description?: string;
  logoUrl?: string | null;
  planCount?: number;
  rating?: number | null;
  reviewsTotal?: number;
  coverUrl?: string | null;
}

const CONNECTOR_WORDS = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'y', 'e', 'en']);

/**
 * Agencia tal como la ve el viajero: columnas públicas y agregados de la función
 * `agencias_publicas()` (0009). Nunca incluye contactos, comisión ni datos de verificación.
 */
export class AgencySummary {
  readonly id: string;
  readonly name: string;
  readonly city: string;
  readonly description: string;
  readonly logoUrl: string | null;
  /** Planes publicados. */
  readonly planCount: number;
  /** Promedio de sus planes ponderado por reseñas; null mientras no tenga ninguna. */
  readonly rating: number | null;
  readonly reviewsTotal: number;
  /** Foto del plan publicado mejor puntuado (o de cualquier plan publicado con foto). */
  readonly coverUrl: string | null;

  constructor(d: AgencySummaryData) {
    this.id = d.id;
    this.name = d.name;
    this.city = d.city;
    this.description = d.description ?? '';
    this.logoUrl = d.logoUrl ?? null;
    this.planCount = d.planCount ?? 0;
    this.rating = d.rating ?? null;
    this.reviewsTotal = d.reviewsTotal ?? 0;
    this.coverUrl = d.coverUrl ?? null;
  }

  get isNew(): boolean {
    return this.rating === null;
  }

  /** «Nueva» mientras no tenga reseñas: un 0 sería engañoso. */
  get ratingText(): string {
    return this.rating === null ? 'Nueva' : this.rating.toFixed(1);
  }

  get plansText(): string {
    return `${this.planCount} ${this.planCount === 1 ? 'plan' : 'planes'}`;
  }

  /**
   * Letras del círculo de respaldo cuando no hay logo: inicial de las dos primeras palabras
   * con contenido (sin «de», «y»…), o las dos primeras letras si es una sola.
   */
  get initials(): string {
    const words = this.name
      .trim()
      .split(/\s+/)
      .filter((p) => p !== '' && !CONNECTOR_WORDS.has(p.toLowerCase()));
    if (words.length === 0) return '?';
    if (words.length === 1) return words[0]!.substring(0, 2).toUpperCase();
    return `${words[0]![0]}${words[1]![0]}`.toUpperCase();
  }

  static fromMap(map: Row): AgencySummary {
    return new AgencySummary({
      id: asString(map['id']),
      name: asString(map['nombre']),
      city: asStringOr(map['ciudad'], ''),
      description: asStringOr(map['descripcion'], ''),
      logoUrl: asStringOrNull(map['logo_url']),
      planCount: asIntOr(map['planes_count'], 0),
      rating: asDoubleOrNull(map['rating']),
      reviewsTotal: asIntOr(map['reviews_total'], 0),
      coverUrl: asStringOrNull(map['portada_url']),
    });
  }
}

/** Criterios de orden de la lista de agencias (solo cliente). */
export const AgencySort = { score: 'puntaje', mostPlans: 'masPlanes', name: 'nombre' } as const;
export type AgencySort = (typeof AgencySort)[keyof typeof AgencySort];

/** `OrdenAgencias.label` de Dart. */
export const LABEL_AGENCY_SORT: Record<AgencySort, string> = {
  puntaje: 'Puntaje',
  masPlanes: 'Más planes',
  nombre: 'Nombre',
};

const ACCENTS: Record<string, string> = { á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ü: 'u', ñ: 'n' };

/** Minúsculas sin tildes, para ordenar «Álamo» junto a «Alfa». */
const nameKey = (name: string) =>
  name
    .toLowerCase()
    .split('')
    .map((c) => ACCENTS[c] ?? c)
    .join('');

/** `String.compareTo` de Dart: por unidades UTF-16, no por locale. */
const compareText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const compareNumber = (a: number, b: number) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * Copia de [agencies] ordenada (no muta la original). Puntaje: mayor primero (empate: más
 * reseñas) y las «Nueva» al final; todos los empates se resuelven por nombre.
 */
export function sortAgencies(agencies: Iterable<AgencySummary>, sort: AgencySort): AgencySummary[] {
  const byName = (a: AgencySummary, b: AgencySummary) => compareText(nameKey(a.name), nameKey(b.name));
  const copy = [...agencies];
  switch (sort) {
    case AgencySort.score:
      return copy.sort((a, b) => {
        if (a.isNew !== b.isNew) return a.isNew ? 1 : -1;
        const r = compareNumber(b.rating ?? 0, a.rating ?? 0);
        if (r !== 0) return r;
        const n = compareNumber(b.reviewsTotal, a.reviewsTotal);
        return n !== 0 ? n : byName(a, b);
      });
    case AgencySort.mostPlans:
      return copy.sort((a, b) => {
        const n = compareNumber(b.planCount, a.planCount);
        return n !== 0 ? n : byName(a, b);
      });
    case AgencySort.name:
      return copy.sort(byName);
  }
}
