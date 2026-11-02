// Tipos globales de SvelteKit. Sin servidor no hay `Locals` ni `PageData`: solo la forma del error.
declare global {
  namespace App {
    interface Error {
      message: string;
    }
  }
}

export {};
