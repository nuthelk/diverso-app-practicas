/** Colores de un aviso según su tono (info, alerta o error); la tinta llega a AA en claro y oscuro. */
export const TONOS_AVISO = {
  info: 'bg-niebla-2 text-tinta border-linea',
  alerta: 'bg-prueba-bg text-prueba-ink border-prueba-ink/40',
  error: 'bg-heliconia-bg text-heliconia border-heliconia',
} as const;

/** El brote del ícono de un aviso: el único acento cálido se queda para lo urgente (error). */
export const BROTES_AVISO = {
  info: 'bg-superficie text-helecho',
  alerta: 'bg-prueba-ink text-prueba-bg',
  error: 'bg-heliconia text-sobre-heliconia',
} as const;
