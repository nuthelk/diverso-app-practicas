import type { HandleClientError } from '@sveltejs/kit';
import { mensajeError } from '$lib/shared/api/errores';

/** Error no previsto al navegar o dibujar: se registra y la página de error muestra el texto legible. */
export const handleError: HandleClientError = ({ error }) => {
  console.error(error);
  return { message: mensajeError(error) };
};
