import { safeGoBack } from '@/router';

/**
 * Patrón «volver» (§1.5 y gotcha 6): abierta en frío (recarga web o deep link) no hay historial,
 * así que en vez de `back()` se reemplaza por la raíz lógica de la pantalla.
 */
function fakeRouter(hasHistory: boolean) {
  return { canGoBack: jest.fn(() => hasHistory), back: jest.fn(), replace: jest.fn() };
}

test('con historial vuelve atrás', () => {
  const router = fakeRouter(true);
  safeGoBack(router, '/agencias');
  expect(router.back).toHaveBeenCalledTimes(1);
  expect(router.replace).not.toHaveBeenCalled();
});

test('sin historial reemplaza por la raíz lógica', () => {
  const router = fakeRouter(false);
  safeGoBack(router, '/agencias');
  expect(router.back).not.toHaveBeenCalled();
  expect(router.replace).toHaveBeenCalledWith('/agencias');
});
