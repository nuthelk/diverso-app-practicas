/** Colores de un aviso según su tono (info, alerta o error); la tinta llega a AA en claro y oscuro. */
export const TONOS_AVISO = {
  info: 'bg-brand-600/10 text-brand-800 dark:text-brand-200',
  alerta: 'bg-orange-500/12 text-alert-ink',
  error: 'bg-red-500/10 text-error-ink',
} as const;
