/** Duración estructurada del formulario: cantidad + unidad ⇄ texto («2 días»). */

export const UNIDADES = ['dias', 'horas', 'minutos'] as const;
export type Unidad = (typeof UNIDADES)[number];

const ETIQUETA_UNIDAD: Record<Unidad, string> = {
  dias: 'día',
  horas: 'hora',
  minutos: 'minuto',
};

/** «día» solo con cantidad 1; en cualquier otro caso, plural. */
function etiquetaUnidad(unidad: Unidad, cantidad: number | null): string {
  return cantidad === 1 ? ETIQUETA_UNIDAD[unidad] : ETIQUETA_UNIDAD[unidad] + 's';
}

export function opcionesUnidad(cantidad: number | null): { valor: Unidad; etiqueta: string }[] {
  return UNIDADES.map((u) => ({ valor: u, etiqueta: etiquetaUnidad(u, cantidad) }));
}

/** El texto que se guarda; vacío si la cantidad no es positiva. */
export function componerDuracion(cantidad: number | null, unidad: Unidad): string {
  const n = cantidad ?? 0;
  if (n <= 0) return '';
  return `${n} ${etiquetaUnidad(unidad, n)}`;
}

/** Lo contrario de componerDuracion; si el texto no trae cantidad y unidad, queda sin cantidad y en días. */
export function parsearDuracion(texto: string): { cantidad: number | null; unidad: Unidad } {
  const m = /(\d+(?:[.,]\d+)?)\s*(d[ií]a|hora|minuto|horas|d[ií]as|minutos)/i.exec(texto);
  if (!m) return { cantidad: null, unidad: 'dias' };
  const u = m[2].toLowerCase();
  return {
    cantidad: parseFloat(m[1].replace(',', '.')),
    unidad: u.startsWith('d') ? 'dias' : u.startsWith('h') ? 'horas' : 'minutos',
  };
}
