import { crearStore, useStore } from './store';

/** Confirmación global: `await confirmar({...})` pregunta antes de una acción que no se deshace y responde true/false. La dibuja `DialogoConfirmar`. */
export interface Pregunta {
  titulo: string;
  mensaje?: string;
  /** Texto del botón que sigue adelante (por defecto «Confirmar»). */
  confirmar?: string;
  /** Texto del botón que desiste (por defecto «Cancelar»). */
  cancelar?: string;
  /** La acción destruye algo: el botón es urgente y el foco empieza en «Cancelar». */
  peligro?: boolean;
}

export const pendiente = crearStore<{ pregunta: Pregunta | null }>({ pregunta: null });

let resolver: ((respuesta: boolean) => void) | null = null;

export function confirmar(pregunta: Pregunta): Promise<boolean> {
  resolver?.(false); // otra pregunta sin responder: se da por cancelada
  return new Promise((resolve) => {
    resolver = resolve;
    pendiente.set({ pregunta });
  });
}

export function responder(respuesta: boolean): void {
  const resolve = resolver;
  resolver = null;
  pendiente.set({ pregunta: null });
  resolve?.(respuesta);
}

/** La pregunta en pantalla (o null), para dibujarla. */
export function usePendiente() {
  return useStore(pendiente);
}
