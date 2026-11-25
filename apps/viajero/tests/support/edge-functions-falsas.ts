import type { EdgeFunctionsApi } from '@/core/data/services/edge-functions-api';
import { isRow, type Row } from '@/core/models/row';

/**
 * Edge Functions falsas: registran cada llamada y devuelven (o lanzan) lo que se les indique,
 * igual que `EdgeFunctionsApiSupabase` ya normalizada (sin red). Equivale a
 * `edge_functions_falsas.dart`: si [respuesta] devuelve un objeto JSON, es la respuesta 2xx; si
 * devuelve cualquier otra cosa (p. ej. `httpError(409, {...})`), se lanza.
 */
export class EdgeFunctionsFalsas implements EdgeFunctionsApi {
  readonly llamadas: [funcion: string, cuerpo: Row][] = [];

  constructor(private readonly respuesta: (funcion: string, cuerpo: Row) => unknown) {}

  async invocar(funcion: string, cuerpo: Row): Promise<Row> {
    this.llamadas.push([funcion, cuerpo]);
    const r = this.respuesta(funcion, cuerpo);
    if (isRow(r) && !(r instanceof Error)) return r;
    throw r;
  }
}
