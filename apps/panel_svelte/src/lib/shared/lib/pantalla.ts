import { MediaQuery } from 'svelte/reactivity';

/**
 * ¿La pantalla es de celular, por debajo de `sm` (640 px)? Las tablas de Ventas y Liquidaciones pasan a lista de tarjetas.
 * Se llama al iniciar el componente; sin `matchMedia` (pruebas, servidor) responde siempre «no».
 */
export function pantallaCelular(): { readonly current: boolean } {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? new MediaQuery('max-width: 639.98px')
    : { current: false };
}
