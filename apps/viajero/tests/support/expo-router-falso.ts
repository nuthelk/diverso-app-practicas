import { useEffect } from 'react';

/**
 * Reemplazo de `expo-router` para probar una pantalla SIN montar el router (las pruebas de rutas
 * usan `renderRouter` de `expo-router/testing-library`). Uso, en el archivo de test:
 *
 *   jest.mock('expo-router', () => require('<ruta>/support/expo-router-falso'));
 *
 * y luego `routerFalso.push` etc. son `jest.fn()` para comprobar a dónde navega la pantalla.
 * Solo trae lo que usan las vistas (las rutas de `src/app` no se montan con este doble).
 */
export const routerFalso = {
  push: jest.fn(),
  replace: jest.fn(),
  navigate: jest.fn(),
  back: jest.fn(),
  dismissAll: jest.fn(),
  canGoBack: jest.fn(() => false),
  canDismiss: jest.fn(() => false),
  setParams: jest.fn(),
};

/** Deja `routerFalso` como recién creado (llamar en `beforeEach`). */
export function reiniciarRouterFalso() {
  for (const fn of Object.values(routerFalso)) fn.mockClear();
  routerFalso.canGoBack.mockImplementation(() => false);
  routerFalso.canDismiss.mockImplementation(() => false);
}

export const router = routerFalso;
export const useRouter = () => routerFalso;
export const useCanGoBack = () => routerFalso.canGoBack();

/** Sin navegador no hay foco: la pantalla está «enfocada» mientras esté montada. */
export function useFocusEffect(efecto: () => void | (() => void)) {
  useEffect(efecto, [efecto]);
}
