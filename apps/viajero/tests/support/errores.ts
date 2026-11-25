import { PostgrestError } from '@supabase/supabase-js';

import { ErrorFuncion } from '@/core/errors/error-funcion';

/**
 * Error de PostgREST como lo lanza supabase-js con `.throwOnError()` (equivale a
 * `PostgrestException(message: …, code: …, details: …)` de los tests Dart).
 */
export function errorPostgrest(
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
export function errorHttp(status: number, cuerpo: Record<string, unknown>): ErrorFuncion {
  return new ErrorFuncion(status, cuerpo);
}

/** Fallo de red al llamar a una Edge Function (equivale a `FunctionsFetchException`, status 0). */
export function errorSinRed(detalle: unknown = 'offline'): ErrorFuncion {
  return new ErrorFuncion(0, detalle);
}

/** Espera a que [accion] falle y devuelve el error (para revisar sus campos). */
export async function capturar<E = unknown>(accion: () => Promise<unknown>): Promise<E> {
  try {
    await accion();
  } catch (e) {
    return e as E;
  }
  throw new Error('debía lanzar');
}
