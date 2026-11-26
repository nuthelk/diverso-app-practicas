import type { Plan } from '../models/plan';

/**
 * Fila del comparador de planes (Anexo 6, idea 7): enfrenta planes con "precio final todo
 * incluido" para decidir sin sorpresas.
 */
export class ComparisonRow {
  /** Identificador estable del atributo (para tests y claves de tabla), no un ícono. */
  readonly icon: string;
  readonly title: string;
  readonly values: readonly string[];

  constructor(icon: string, title: string, values: readonly string[]) {
    this.icon = icon;
    this.title = title;
    this.values = values;
  }
}

const included = (value: boolean) => (value ? '✓ Incluido' : '—');

/**
 * Construye las filas comparables de 2-3 planes: precio final, duración, rating,
 * transporte/comida/hospedaje, próximos cupos y política. El total se calcula para [pax] viajeros
 * (2 por defecto). Precio y total son el número crudo (`toStringAsFixed(0)` ≡ `toFixed(0)`).
 */
export function buildComparisonRows(plans: readonly Plan[], { pax = 2 }: { pax?: number } = {}): ComparisonRow[] {
  if (plans.length === 0) return [];

  return [
    new ComparisonRow('price', 'Precio final por persona', plans.map((p) => p.priceCop.toFixed(0))),
    new ComparisonRow(
      'total',
      `Total para ${pax} ${pax === 1 ? 'persona' : 'personas'}`,
      plans.map((p) => (p.priceCop * pax).toFixed(0)),
    ),
    new ComparisonRow('duration', 'Duración', plans.map((p) => p.durationText)),
    new ComparisonRow('destination', 'Destino', plans.map((p) => p.destination)),
    new ComparisonRow(
      'rating',
      'Calificación',
      plans.map((p) => (p.isNew ? 'Nueva' : `${p.averageRating.toFixed(1)} ★ (${p.reviewsCount})`)),
    ),
    new ComparisonRow('transport', 'Transporte', plans.map((p) => included(p.includesTransport))),
    new ComparisonRow('food', 'Comida', plans.map((p) => included(p.includesFood))),
    new ComparisonRow('lodging', 'Hospedaje', plans.map((p) => included(p.includesLodging))),
    new ComparisonRow(
      'spots',
      'Próximos cupos',
      plans.map((p) => {
        const first = p.availableDates[0];
        return first === undefined
          ? 'Sin fechas'
          : `${first.availableSpots} el ${first.date.getDate()}/${first.date.getMonth() + 1}`;
      }),
    ),
    new ComparisonRow(
      'cancellation',
      'Cancelación',
      plans.map((p) => (p.cancellationPolicy === '' ? '—' : p.cancellationPolicy)),
    ),
  ];
}
