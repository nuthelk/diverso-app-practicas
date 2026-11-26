import { useEffect } from 'react';

/**
 * Reemplazo de `expo-router` para probar una pantalla SIN montar el router (las pruebas de rutas
 * usan `renderRouter` de `expo-router/testing-library`). Uso, en el archivo de test:
 *
 *   jest.mock('expo-router', () => require('<ruta>/support/fake-expo-router'));
 *
 * y luego `fakeRouter.push` etc. son `jest.fn()` para comprobar a dónde navega la pantalla.
 * Solo trae lo que usan las vistas (las rutas de `src/app` no se montan con este doble).
 */
export const fakeRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  navigate: jest.fn(),
  back: jest.fn(),
  dismissAll: jest.fn(),
  canGoBack: jest.fn(() => false),
  canDismiss: jest.fn(() => false),
  setParams: jest.fn(),
};

/** Deja `fakeRouter` como recién creado (llamar en `beforeEach`). */
export function resetFakeRouter() {
  for (const fn of Object.values(fakeRouter)) fn.mockClear();
  fakeRouter.canGoBack.mockImplementation(() => false);
  fakeRouter.canDismiss.mockImplementation(() => false);
}

export const router = fakeRouter;
export const useRouter = () => fakeRouter;
export const useCanGoBack = () => fakeRouter.canGoBack();

/** Sin navegador no hay foco: la pantalla está «enfocada» mientras esté montada. */
export function useFocusEffect(effect: () => void | (() => void)) {
  useEffect(effect, [effect]);
}
