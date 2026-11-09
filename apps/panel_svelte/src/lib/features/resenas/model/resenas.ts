/** Todas las reseñas de la agencia, de a páginas (función `resenas_agencia`, migración 0018). */

import type { ResenaReciente } from '$lib/features/resumen/model/quienes-van';

/** Lo mismo que las reseñas del Resumen, más el id de la reseña para usarlo de llave en la lista. */
export type ResenaAgencia = ResenaReciente & { id: string };

/** Cuántas reseñas trae cada página: una página más corta es la última. */
export const TAMANO_PAGINA = 20;
