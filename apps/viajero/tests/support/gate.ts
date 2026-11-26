/**
 * Promesa que el test completa a mano (`Completer` de Dart): sirve para respuestas tardías o
 * colgadas.
 */
export interface Gate<T = void> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
}

export function createGate<T = void>(): Gate<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

/** Deja correr las microtareas pendientes (`Future.delayed(Duration.zero)` de Dart). */
export async function flushMicrotasks(): Promise<void> {
  for (let i = 0; i < 5; i++) await Promise.resolve();
}
