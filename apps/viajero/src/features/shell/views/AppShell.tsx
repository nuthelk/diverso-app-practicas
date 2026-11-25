import { Tabs } from 'expo-router/tabs';

import { useTheme } from '@/ui/theme';

import { BottomBar, TABS } from '../components/BottomBar';

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
 * key que ya no existe, en desarrollo sale un error rojo. El orden VISUAL lo pone la barra (TABS).
 */
const NAVIGATOR_ORDER = ['index', 'perfil', 'agencias', 'reservas'] as const;

export function AppShell() {
  const theme = useTheme();
  return (
    <Tabs
      tabBar={(props) => <BottomBar {...props} />}
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        sceneStyle: { backgroundColor: theme.pageBackground },
      }}
    >
      {NAVIGATOR_ORDER.map((routeName) => (
        <Tabs.Screen key={routeName} name={routeName} options={{ title: TABS.find((d) => d.routeName === routeName)?.label }} />
      ))}
    </Tabs>
  );
}
