/** `ArgumentError` de Dart: se llamó con argumentos inválidos (error del programador, no del usuario). */
export class ArgumentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ArgumentError';
  }
}

/** `StateError` de Dart: la operación no tiene sentido en el estado actual (p. ej. sin sesión). */
export class StateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StateError';
  }
}
