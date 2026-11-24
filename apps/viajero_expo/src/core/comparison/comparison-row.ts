import type { Plan } from '../models/plan';

/**
 * Fila del comparador de planes (Anexo 6, idea 7): enfrenta planes con "precio final todo
 * incluido" para decidir sin sorpresas.
 */
export class ComparisonRow {
  /** Identificador estable del atributo (para tests y claves de tabla), no un ícono. */
  readonly icono: string;
  readonly titulo: string;
  readonly valores: readonly string[];

  constructor(icono: string, titulo: string, valores: readonly string[]) {
    this.icono = icono;
    this.titulo = titulo;
    this.valores = valores;
  }
}

const incluido = (si: boolean) => (si ? '✓ Incluido' : '—');

/**
 * Construye las filas comparables de 2-3 planes: precio final, duración, rating,
 * transporte/comida/hospedaje, próximos cupos y política. El total se calcula para [pax] viajeros
 * (2 por defecto). Precio y total son el número crudo (`toStringAsFixed(0)` ≡ `toFixed(0)`).
 */
export function buildComparisonRows(planes: readonly Plan[], { pax = 2 }: { pax?: number } = {}): ComparisonRow[] {
  if (planes.length === 0) return [];

  return [
    new ComparisonRow('precio', 'Precio final por persona', planes.map((p) => p.precioCop.toFixed(0))),
    new ComparisonRow(
      'total',
      `Total para ${pax} ${pax === 1 ? 'persona' : 'personas'}`,
      planes.map((p) => (p.precioCop * pax).toFixed(0)),
    ),
    new ComparisonRow('duracion', 'Duración', planes.map((p) => p.duracionTexto)),
    new ComparisonRow('destino', 'Destino', planes.map((p) => p.destino)),
    new ComparisonRow(
      'rating',
      'Calificación',
      planes.map((p) => (p.esNuevo ? 'Nueva' : `${p.ratingPromedio.toFixed(1)} ★ (${p.reviewsCount})`)),
    ),
    new ComparisonRow('transporte', 'Transporte', planes.map((p) => incluido(p.incluyeTransporte))),
    new ComparisonRow('comida', 'Comida', planes.map((p) => incluido(p.incluyeComida))),
    new ComparisonRow('hospedaje', 'Hospedaje', planes.map((p) => incluido(p.incluyeHospedaje))),
    new ComparisonRow(
      'cupos',
      'Próximos cupos',
      planes.map((p) => {
        const primera = p.fechasDisponibles[0];
        return primera === undefined
          ? 'Sin fechas'
          : `${primera.cupoDisponible} el ${primera.fecha.getDate()}/${primera.fecha.getMonth() + 1}`;
      }),
    ),
    new ComparisonRow(
      'cancelacion',
      'Cancelación',
      planes.map((p) => (p.politicaCancelacion === '' ? '—' : p.politicaCancelacion)),
    ),
  ];
}
