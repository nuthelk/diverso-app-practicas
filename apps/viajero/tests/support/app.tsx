import { act, renderRouter, screen } from 'expo-router/testing-library';

import type { Dependencies } from '@/composition';
import { AppRoot } from '@/composition/AppRoot';

import { dependenciasDePrueba } from './dependencias-de-prueba';

/**
 * Arranca la app tal como la cablea `src/app/_layout.tsx` (providers + guard + todas las rutas
 * reales de `src/app`), pero con dobles en vez de Supabase: el `buildViajeroApp(...)` con fakes de
 * `app_arranque_test.dart`. `renderRouter` usa temporizadores falsos.
 */
export async function arrancarApp(url = '/', dependencias: Dependencies = dependenciasDePrueba()) {
  const r = await renderRouter(
    {
      appDir: 'src/app',
      overrides: { _layout: () => <AppRoot dependencies={dependencias} /> },
    },
    { initialUrl: url },
  );
  await asentar();
  return r;
}

/**
 * `pumpAndSettle`: deja correr microtareas, efectos y temporizadores cortos (animaciones,
 * navegación). No llega a los 15 s del límite del consentimiento.
 */
export async function asentar(veces = 8) {
  for (let i = 0; i < veces; i++) {
    await act(async () => {
      await jest.advanceTimersByTimeAsync(50);
    });
  }
}

/** La pantalla placeholder (o real) que se ve, por su testID `pantalla-<Nombre>`. */
export function pantallaVisible(nombre: string) {
  return screen.queryByTestId(`pantalla-${nombre}`);
}
