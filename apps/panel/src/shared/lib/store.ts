import { useSyncExternalStore } from 'react';

/**
 * Estado global mínimo, sin librerías: un valor, quién lo escucha y cómo cambiarlo.
 * Lo usan auth, toast, confirmar, tema y cambios de agencia:
 * el valor vive fuera de React y los componentes se suscriben con `useStore` (por dentro, `useSyncExternalStore`).
 *
 * El valor es inmutable: `set` crea un objeto nuevo, así React sabe que cambió comparando referencias.
 */
export interface Store<T extends object> {
  /** El valor actual (para leerlo fuera de React: en funciones del modelo o en tests). */
  get(): T;
  /** Cambia el valor: un objeto parcial se mezcla con el actual; una función recibe el anterior y devuelve el nuevo. */
  set(cambio: Partial<T> | ((previo: T) => T)): void;
  /** Avisa a `oyente` en cada cambio; devuelve cómo dejar de escuchar. */
  subscribe(oyente: () => void): () => void;
}

export function crearStore<T extends object>(inicial: T): Store<T> {
  let valor = inicial;
  const oyentes = new Set<() => void>();
  return {
    get: () => valor,
    set(cambio) {
      valor = typeof cambio === 'function' ? cambio(valor) : { ...valor, ...cambio };
      oyentes.forEach((oyente) => oyente());
    },
    subscribe(oyente) {
      oyentes.add(oyente);
      return () => oyentes.delete(oyente);
    },
  };
}

/** Lee un store desde un componente y lo vuelve a dibujar cuando cambia. */
export function useStore<T extends object>(store: Store<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}
