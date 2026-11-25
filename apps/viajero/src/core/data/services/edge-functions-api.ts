import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
  type SupabaseClient,
} from '@supabase/supabase-js';

import { ErrorFuncion } from '../../errors/error-funcion';
import { isRow, type Row } from '../../models/row';

/**
 * Edge Functions de Supabase. `functions.invoke` envía la sesión del usuario (JWT) en
 * `Authorization`; la app nunca ve llaves de Wompi.
 */
export interface EdgeFunctionsApi {
  /**
   * Llama a [funcion] con el cuerpo JSON y devuelve el JSON de la respuesta 2xx. Cualquier fallo
   * se lanza como [ErrorFuncion] (como `FunctionException` en Dart).
   */
  invocar(funcion: string, cuerpo: Row): Promise<Row>;
}

/** Lee el cuerpo de un no‑2xx: JSON si se puede, si no el texto. */
async function cuerpoDe(respuesta: Response | undefined): Promise<unknown> {
  if (respuesta === undefined) return null;
  let texto: string;
  try {
    texto = await respuesta.text();
  } catch {
    return null;
  }
  try {
    return JSON.parse(texto);
  } catch {
    return texto;
  }
}

/**
 * supabase-js NO lanza: devuelve `{data, error}`. Un no‑2xx es `FunctionsHttpError` y el cuerpo
 * `{error, mensaje, …}` está en `error.context` (la `Response`). Red caída o relay → status 0.
 */
async function aErrorFuncion(error: unknown): Promise<unknown> {
  if (error instanceof FunctionsHttpError) {
    const respuesta = error.context as Response | undefined;
    return new ErrorFuncion(respuesta?.status ?? 500, await cuerpoDe(respuesta));
  }
  if (error instanceof FunctionsFetchError || error instanceof FunctionsRelayError) {
    return new ErrorFuncion(0, error.message);
  }
  return error;
}

export class EdgeFunctionsApiSupabase implements EdgeFunctionsApi {
  private readonly client: SupabaseClient;

  constructor({ client }: { client: SupabaseClient }) {
    this.client = client;
  }

  async invocar(funcion: string, cuerpo: Row): Promise<Row> {
    const { data, error, response } = await this.client.functions.invoke(funcion, { body: cuerpo });
    if (error) throw await aErrorFuncion(error);
    if (isRow(data)) return data;
    throw new ErrorFuncion(response?.status ?? 200, data);
  }
}
