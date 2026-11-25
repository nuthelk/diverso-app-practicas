import type { EdgeFunctionsApi } from '@/core/data/services/edge-functions-api';
import { isRow, type Row } from '@/core/models/row';

/**
 * Edge Functions falsas: registran cada llamada y devuelven (o lanzan) lo que se les indique,
 * igual que `EdgeFunctionsApiSupabase` ya normalizada (sin red). Equivale a
 * `edge_functions_falsas.dart`: si [respond] devuelve un objeto JSON, es la respuesta 2xx; si
 * devuelve cualquier otra cosa (p. ej. `httpError(409, {...})`), se lanza.
 */
export class FakeEdgeFunctions implements EdgeFunctionsApi {
  readonly calls: [fn: string, body: Row][] = [];

  constructor(private readonly respond: (fn: string, body: Row) => unknown) {}

  async invoke(fn: string, body: Row): Promise<Row> {
    this.calls.push([fn, body]);
    const r = this.respond(fn, body);
    if (isRow(r) && !(r instanceof Error)) return r;
    throw r;
  }
}
