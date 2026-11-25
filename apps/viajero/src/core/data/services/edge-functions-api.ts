import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
  type SupabaseClient,
} from '@supabase/supabase-js';

import { FunctionError } from '../../errors/function-error';
import { isRow, type Row } from '../../models/row';

/**
 * Edge Functions de Supabase. `functions.invoke` envía la sesión del usuario (JWT) en
 * `Authorization`; la app nunca ve llaves de Wompi.
 */
export interface EdgeFunctionsApi {
  /**
   * Llama a [fn] con el cuerpo JSON y devuelve el JSON de la respuesta 2xx. Cualquier fallo
   * se lanza como [FunctionError] (como `FunctionException` en Dart).
   */
  invoke(fn: string, body: Row): Promise<Row>;
}

/** Lee el cuerpo de un no‑2xx: JSON si se puede, si no el texto. */
async function readBody(response: Response | undefined): Promise<unknown> {
  if (response === undefined) return null;
  let text: string;
  try {
    text = await response.text();
  } catch {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * supabase-js NO lanza: devuelve `{data, error}`. Un no‑2xx es `FunctionsHttpError` y el cuerpo
 * `{error, mensaje, …}` está en `error.context` (la `Response`). Red caída o relay → status 0.
 */
async function toFunctionError(error: unknown): Promise<unknown> {
  if (error instanceof FunctionsHttpError) {
    const response = error.context as Response | undefined;
    return new FunctionError(response?.status ?? 500, await readBody(response));
  }
  if (error instanceof FunctionsFetchError || error instanceof FunctionsRelayError) {
    return new FunctionError(0, error.message);
  }
  return error;
}

export class EdgeFunctionsApiSupabase implements EdgeFunctionsApi {
  private readonly client: SupabaseClient;

  constructor({ client }: { client: SupabaseClient }) {
    this.client = client;
  }

  async invoke(fn: string, body: Row): Promise<Row> {
    const { data, error, response } = await this.client.functions.invoke(fn, { body });
    if (error) throw await toFunctionError(error);
    if (isRow(data)) return data;
    throw new FunctionError(response?.status ?? 200, data);
  }
}
