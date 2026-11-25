import { act } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

/**
 * Ciclo de vida de la app bajo control del test (el `handleAppLifecycleStateChanged` de
 * `flutter_test`): intercepta `AppState.addEventListener('change')` y deja emitir estados.
 */
export function controlarAppState() {
  const escuchas = new Set<(estado: AppStateStatus) => void>();
  const espia = jest.spyOn(AppState, 'addEventListener').mockImplementation((tipo, escucha) => {
    if (tipo === 'change') escuchas.add(escucha as (estado: AppStateStatus) => void);
    return { remove: () => escuchas.delete(escucha as (estado: AppStateStatus) => void) } as never;
  });
  return {
    get oyentes() {
      return escuchas.size;
    },
    async emitir(estado: AppStateStatus) {
      await act(async () => {
        for (const e of [...escuchas]) e(estado);
      });
    },
    /** La app pasa a segundo plano y vuelve a primer plano. */
    async irASegundoPlanoYVolver() {
      for (const estado of ['inactive', 'background', 'active'] as const) await this.emitir(estado);
    },
    restaurar: () => espia.mockRestore(),
  };
}
