import { mensajeError } from '@/shared/api/errores';

/**
 * Error no previsto al navegar o dibujar: se registra y la página de error muestra el texto legible.
 * Una ruta que no existe (404) es esperada: la página de error la explica y no se registra.
 *
 * Lo llama `ErrorPage` con el error de la ruta.
 */
export function manejarError({ error, status }: { error: unknown; status: number }): { message: string } {
  if (status !== 404) console.error(error);
  return { message: mensajeError(error) };
}
