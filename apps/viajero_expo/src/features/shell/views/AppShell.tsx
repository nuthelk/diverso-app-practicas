import { Tabs } from 'expo-router/tabs';

import { useTheme } from '@/ui/theme';

import { BarraInferior, DESTINOS } from '../components/BarraInferior';

/**
 * Shell de pestañas (layout de `src/app/(tabs)`): Explorar `/`, Agencias, Reservas y Perfil con
 * la barra inferior de Material 3. Cada pestaña conserva su estado al cambiar (se montan la
 * primera vez y no se desmontan, como el `StatefulShellRoute.indexedStack`) y el cambio es
 * fade-through. El contenido termina donde empieza la barra (no flota encima).
 *
 * El consentimiento no se pide aquí: lo decide el guard de la raíz (`NavegacionDeLaApp`).
 */
export function AppShell() {
  const tema = useTheme();
  return (
    <Tabs
      tabBar={(props) => <BarraInferior {...props} />}
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        sceneStyle: { backgroundColor: tema.fondoPagina },
      }}
    >
      {DESTINOS.map((d) => (
        <Tabs.Screen key={d.ruta} name={d.ruta} options={{ title: d.etiqueta }} />
      ))}
    </Tabs>
  );
}
