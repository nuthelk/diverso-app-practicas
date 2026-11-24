import { DiversoError } from '@/core';

/**
 * Texto en español para el viajero de cualquier error que llegue a un view model
 * (`mensaje_de_error.dart`): los de la app (`DiversoError`) con su mensaje propio; los de PostgREST
 * por su código; el resto como error inesperado. Lo usan los view models de todas las
 * funcionalidades (por eso vive en `features/compartido`).
 */
export function mensajeDeError(error: unknown): string {
  const falla = error instanceof DiversoError ? error : DiversoError.fromPostgrest(error);
  return falla.mensajeUsuario;
}
