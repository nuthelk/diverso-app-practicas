import { DOCUMENTOS } from '@/features/legal/model/legal';

/**
 * Solo los ids de documentos legales que existen: otro texto en `/legal/…` cae en la página de error (404).
 * Lo usa el `loader` de la ruta `/legal/:doc?`.
 */
export const match = (param: string): boolean => Object.hasOwn(DOCUMENTOS, param);
