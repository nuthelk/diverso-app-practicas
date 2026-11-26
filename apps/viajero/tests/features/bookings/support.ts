import { act } from '@testing-library/react-native';

/**
 * `pumpAndSettle` de las pantallas montadas sin router (temporizadores reales): deja correr las
 * respuestas de los repositorios falsos y los efectos que disparan.
 */
export async function settleScreen(times = 5) {
  for (let i = 0; i < times; i++) {
    await act(async () => {
      await Promise.resolve();
    });
  }
}
