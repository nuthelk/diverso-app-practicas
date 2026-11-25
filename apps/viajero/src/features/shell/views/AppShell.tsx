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
/**
 * Orden en que se DECLARAN las pestañas: el mismo en que Expo Router arma su estado inicial. Si
 * difiere, React Navigation despacha ROUTE_NAMES_CHANGED al arrancar y, como la acción apunta a una
 * key que ya no existe, en desarrollo sale un error rojo. El orden VISUAL lo pone la barra (DESTINOS).
 */
const ORDEN_DEL_NAVEGADOR = ['index', 'perfil', 'agencias', 'reservas'] as const;

export function AppShell() {
  const tema = useTheme();
  return (
    <Tabs
      tabBar={(props) => <BarraInferior {...props} />}
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        sceneStyle: { backgroundColor: tema.pageBackground },
      }}
    >
      {ORDEN_DEL_NAVEGADOR.map((ruta) => (
        <Tabs.Screen key={ruta} name={ruta} options={{ title: DESTINOS.find((d) => d.ruta === ruta)?.etiqueta }} />
      ))}
    </Tabs>
  );
}
