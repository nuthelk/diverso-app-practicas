import type { ParamMatcher } from '@sveltejs/kit';
import { DOCUMENTOS } from '$lib/features/legal/model/legal';

/** Solo los ids de documentos legales que existen: otro texto en `/legal/…` cae en la página de error. */
export const match: ParamMatcher = (param) => Object.hasOwn(DOCUMENTOS, param);
