import { act } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

/**
 * Ciclo de vida de la app bajo control del test (el `handleAppLifecycleStateChanged` de
 * `flutter_test`): intercepta `AppState.addEventListener('change')` y deja emitir estados.
 */
export function controlAppState() {
  const listeners = new Set<(state: AppStateStatus) => void>();
  const spy = jest.spyOn(AppState, 'addEventListener').mockImplementation((eventType, listener) => {
    if (eventType === 'change') listeners.add(listener as (state: AppStateStatus) => void);
    return { remove: () => listeners.delete(listener as (state: AppStateStatus) => void) } as never;
  });
  return {
    get listenerCount() {
      return listeners.size;
    },
    async emit(state: AppStateStatus) {
      await act(async () => {
        for (const e of [...listeners]) e(state);
      });
    },
    /** La app pasa a segundo plano y vuelve a primer plano. */
    async goToBackgroundAndBack() {
      for (const state of ['inactive', 'background', 'active'] as const) await this.emit(state);
    },
    restore: () => spy.mockRestore(),
  };
}
