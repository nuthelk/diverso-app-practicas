import { crearStore, useStore } from './store';

/**
 * Tema del panel: la preferencia (Sistema, Claro u Oscuro) y la clase `dark` de <html>.
 * El script de `index.html` aplica lo mismo antes del primer render; aquí se mantiene en vivo.
 */
export type Preferencia = 'sistema' | 'claro' | 'oscuro';

export const CLAVE_TEMA = 'diverso-panel-theme';

/** `preferencia` es lo que eligió la persona; `oscuro` es lo que se está mostrando. */
export const tema = crearStore<{ preferencia: Preferencia; oscuro: boolean }>({ preferencia: 'sistema', oscuro: false });

/** Un valor guardado → su preferencia; lo desconocido es «sistema». Los valores de la versión anterior (`light`/`dark`) se respetan. */
export function leerPreferencia(guardado: string | null): Preferencia {
  if (guardado === 'claro' || guardado === 'light') return 'claro';
  if (guardado === 'oscuro' || guardado === 'dark') return 'oscuro';
  return 'sistema';
}

const consultaSistema = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null;

function aplicar(): void {
  const { preferencia } = tema.get();
  const oscuro = preferencia === 'oscuro' || (preferencia === 'sistema' && !!consultaSistema()?.matches);
  tema.set({ oscuro });
  document.documentElement.classList.toggle('dark', oscuro);
}

/** Lee lo guardado, lo aplica y sigue los cambios del sistema mientras la preferencia sea «sistema». Devuelve cómo dejar de seguirlos. */
export function iniciarTema(): () => void {
  let guardado: string | null = null;
  try {
    guardado = localStorage.getItem(CLAVE_TEMA);
  } catch {
    /* almacenamiento no disponible: se sigue al sistema */
  }
  tema.set({ preferencia: leerPreferencia(guardado) });
  aplicar();

  const consulta = consultaSistema();
  const alCambiar = () => {
    if (tema.get().preferencia === 'sistema') aplicar();
  };
  consulta?.addEventListener('change', alCambiar);
  return () => consulta?.removeEventListener('change', alCambiar);
}

export function elegirTema(preferencia: Preferencia): void {
  tema.set({ preferencia });
  try {
    localStorage.setItem(CLAVE_TEMA, preferencia);
  } catch {
    /* almacenamiento no disponible: la elección solo dura esta sesión */
  }
  aplicar();
}

/** La preferencia y si se ve oscuro, para dibujar el selector de tema. */
export function useTema() {
  return useStore(tema);
}
