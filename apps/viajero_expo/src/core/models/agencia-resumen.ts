import { decimalONulo, enteroO, type Fila, texto, textoO, textoONulo } from './fila';

export interface DatosAgenciaResumen {
  id: string;
  nombre: string;
  ciudad: string;
  descripcion?: string;
  logoUrl?: string | null;
  planesCount?: number;
  rating?: number | null;
  reviewsTotal?: number;
  portadaUrl?: string | null;
}

const CONECTORES = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'y', 'e', 'en']);

/**
 * Agencia tal como la ve el viajero: columnas públicas y agregados de la función
 * `agencias_publicas()` (0009). Nunca incluye contactos, comisión ni datos de verificación.
 */
export class AgenciaResumen {
  readonly id: string;
  readonly nombre: string;
  readonly ciudad: string;
  readonly descripcion: string;
  readonly logoUrl: string | null;
  /** Planes publicados. */
  readonly planesCount: number;
  /** Promedio de sus planes ponderado por reseñas; null mientras no tenga ninguna. */
  readonly rating: number | null;
  readonly reviewsTotal: number;
  /** Foto del plan publicado mejor puntuado (o de cualquier plan publicado con foto). */
  readonly portadaUrl: string | null;

  constructor(d: DatosAgenciaResumen) {
    this.id = d.id;
    this.nombre = d.nombre;
    this.ciudad = d.ciudad;
    this.descripcion = d.descripcion ?? '';
    this.logoUrl = d.logoUrl ?? null;
    this.planesCount = d.planesCount ?? 0;
    this.rating = d.rating ?? null;
    this.reviewsTotal = d.reviewsTotal ?? 0;
    this.portadaUrl = d.portadaUrl ?? null;
  }

  get esNueva(): boolean {
    return this.rating === null;
  }

  /** «Nueva» mientras no tenga reseñas: un 0 sería engañoso. */
  get puntajeTexto(): string {
    return this.rating === null ? 'Nueva' : this.rating.toFixed(1);
  }

  get planesTexto(): string {
    return `${this.planesCount} ${this.planesCount === 1 ? 'plan' : 'planes'}`;
  }

  /**
   * Letras del círculo de respaldo cuando no hay logo: inicial de las dos primeras palabras
   * con contenido (sin «de», «y»…), o las dos primeras letras si es una sola.
   */
  get iniciales(): string {
    const palabras = this.nombre
      .trim()
      .split(/\s+/)
      .filter((p) => p !== '' && !CONECTORES.has(p.toLowerCase()));
    if (palabras.length === 0) return '?';
    if (palabras.length === 1) return palabras[0]!.substring(0, 2).toUpperCase();
    return `${palabras[0]![0]}${palabras[1]![0]}`.toUpperCase();
  }

  static fromMap(map: Fila): AgenciaResumen {
    return new AgenciaResumen({
      id: texto(map['id']),
      nombre: texto(map['nombre']),
      ciudad: textoO(map['ciudad'], ''),
      descripcion: textoO(map['descripcion'], ''),
      logoUrl: textoONulo(map['logo_url']),
      planesCount: enteroO(map['planes_count'], 0),
      rating: decimalONulo(map['rating']),
      reviewsTotal: enteroO(map['reviews_total'], 0),
      portadaUrl: textoONulo(map['portada_url']),
    });
  }
}

/** Criterios de orden de la lista de agencias (solo cliente). */
export const OrdenAgencias = { puntaje: 'puntaje', masPlanes: 'masPlanes', nombre: 'nombre' } as const;
export type OrdenAgencias = (typeof OrdenAgencias)[keyof typeof OrdenAgencias];

/** `OrdenAgencias.label` de Dart. */
export const LABEL_ORDEN_AGENCIAS: Record<OrdenAgencias, string> = {
  puntaje: 'Puntaje',
  masPlanes: 'Más planes',
  nombre: 'Nombre',
};

const ACENTOS: Record<string, string> = { á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ü: 'u', ñ: 'n' };

/** Minúsculas sin tildes, para ordenar «Álamo» junto a «Alfa». */
const claveNombre = (nombre: string) =>
  nombre
    .toLowerCase()
    .split('')
    .map((c) => ACENTOS[c] ?? c)
    .join('');

/** `String.compareTo` de Dart: por unidades UTF-16, no por locale. */
const compararTexto = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const compararNumero = (a: number, b: number) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * Copia de [agencias] ordenada (no muta la original). Puntaje: mayor primero (empate: más
 * reseñas) y las «Nueva» al final; todos los empates se resuelven por nombre.
 */
export function ordenarAgencias(agencias: Iterable<AgenciaResumen>, orden: OrdenAgencias): AgenciaResumen[] {
  const porNombre = (a: AgenciaResumen, b: AgenciaResumen) => compararTexto(claveNombre(a.nombre), claveNombre(b.nombre));
  const copia = [...agencias];
  switch (orden) {
    case OrdenAgencias.puntaje:
      return copia.sort((a, b) => {
        if (a.esNueva !== b.esNueva) return a.esNueva ? 1 : -1;
        const r = compararNumero(b.rating ?? 0, a.rating ?? 0);
        if (r !== 0) return r;
        const n = compararNumero(b.reviewsTotal, a.reviewsTotal);
        return n !== 0 ? n : porNombre(a, b);
      });
    case OrdenAgencias.masPlanes:
      return copia.sort((a, b) => {
        const n = compararNumero(b.planesCount, a.planesCount);
        return n !== 0 ? n : porNombre(a, b);
      });
    case OrdenAgencias.nombre:
      return copia.sort(porNombre);
  }
}
