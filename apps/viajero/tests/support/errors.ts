import { PostgrestError } from '@supabase/supabase-js';

import { FunctionError } from '@/core/errors/function-error';

/**
 * Error de PostgREST como lo lanza supabase-js con `.throwOnError()` (equivale a
 * `PostgrestException(message: …, code: …, details: …)` de los tests Dart).
 */
export function postgrestError(
  message: string,
  extra: { code?: string; details?: string | null } = {},
): PostgrestError {
  return new PostgrestError({
    message,
    code: extra.code ?? '',
    details: (extra.details ?? null) as string,
    hint: '',
  });
}

/** Respuesta no‑2xx de una Edge Function (equivale a `FunctionException(status, details)`). */
export function httpError(status: number, body: Record<string, unknown>): FunctionError {
  return new FunctionError(status, body);
}

/** Fallo de red al llamar a una Edge Function (equivale a `FunctionsFetchException`, status 0). */
export function networkError(detail: unknown = 'offline'): FunctionError {
  return new FunctionError(0, detail);
}

/** Espera a que [action] falle y devuelve el error (para revisar sus campos). */
export async function capture<E = unknown>(action: () => Promise<unknown>): Promise<E> {
  try {
    await action();
  } catch (e) {
    return e as E;
  }
  throw new Error('debía lanzar');
}
