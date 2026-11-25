/**
 * Fallo de una Edge Function, ya normalizado desde supabase-js (equivale a `FunctionException`
 * de supabase_flutter):
 * - `FunctionsHttpError` (respuesta no‑2xx) → `status` HTTP y `details` = cuerpo JSON (`error.context.json()`).
 * - `FunctionsFetchError` / `FunctionsRelayError` (red caída o relay) → `status` 0.
 * - 2xx cuyo cuerpo no es un objeto JSON → `status` de la respuesta y `details` = lo que llegó.
 */
export class ErrorFuncion extends Error {
  readonly status: number;
  readonly details: unknown;

  constructor(status: number, details: unknown) {
    super(`ErrorFuncion(${status})`);
    this.name = 'ErrorFuncion';
    this.status = status;
    this.details = details;
  }
}
