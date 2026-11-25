import { crearStore, useStore } from './store';

/** Toast global mínimo: un solo mensaje a la vez, que se borra solo. Lo dibuja `Toast`. */
export const toast = crearStore({ mensaje: '' });
let timer: ReturnType<typeof setTimeout> | undefined;

export function avisar(mensaje: string): void {
  toast.set({ mensaje });
  clearTimeout(timer);
  timer = setTimeout(() => toast.set({ mensaje: '' }), 3200);
}

/** El toast actual, para dibujarlo. */
export function useToast() {
  return useStore(toast);
}
