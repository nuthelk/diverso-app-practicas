/**
 * Promesa que el test completa a mano (`Completer` de Dart): sirve para respuestas tardías o
 * colgadas.
 */
export interface Compuerta<T = void> {
  promesa: Promise<T>;
  completar: (valor: T) => void;
  fallar: (error: unknown) => void;
}

export function compuerta<T = void>(): Compuerta<T> {
  let completar!: (valor: T) => void;
  let fallar!: (error: unknown) => void;
  const promesa = new Promise<T>((resolver, rechazar) => {
    completar = resolver;
    fallar = rechazar;
  });
  return { promesa, completar, fallar };
}

/** Deja correr las microtareas pendientes (`Future.delayed(Duration.zero)` de Dart). */
export async function esperar(): Promise<void> {
  for (let i = 0; i < 5; i++) await Promise.resolve();
}
