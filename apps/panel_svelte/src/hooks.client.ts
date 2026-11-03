import type { HandleClientError } from '@sveltejs/kit';
import { mensajeError } from '$lib/shared/api/errores';

/**
 * Error no previsto al navegar o dibujar: se registra y la página de error muestra el texto legible.
 * Una ruta que no existe (404) es esperada: la página de error la explica y no se registra.
 */
export const handleError: HandleClientError = ({ error, status }) => {
  if (status !== 404) console.error(error);
  return { message: mensajeError(error) };
};
