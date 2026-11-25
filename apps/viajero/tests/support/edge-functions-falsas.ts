import type { EdgeFunctionsApi } from '@/core/data/services/edge-functions-api';
import { esFila, type Fila } from '@/core/models/fila';

/**
 * Edge Functions falsas: registran cada llamada y devuelven (o lanzan) lo que se les indique,
 * igual que `EdgeFunctionsApiSupabase` ya normalizada (sin red). Equivale a
 * `edge_functions_falsas.dart`: si [respuesta] devuelve un objeto JSON, es la respuesta 2xx; si
 * devuelve cualquier otra cosa (p. ej. `errorHttp(409, {...})`), se lanza.
 */
export class EdgeFunctionsFalsas implements EdgeFunctionsApi {
  readonly llamadas: [funcion: string, cuerpo: Fila][] = [];

  constructor(private readonly respuesta: (funcion: string, cuerpo: Fila) => unknown) {}

  async invocar(funcion: string, cuerpo: Fila): Promise<Fila> {
    this.llamadas.push([funcion, cuerpo]);
    const r = this.respuesta(funcion, cuerpo);
    if (esFila(r) && !(r instanceof Error)) return r;
    throw r;
  }
}
