import { Stack, useRouter, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';

import { useSession } from '@/features/auth/view-models/SessionProvider';
import { useConsent } from '@/features/legal/view-models/ConsentProvider';
import type { ConsentState } from '@/features/legal/view-models/consent-view-model';
import { screenOptions, useTheme } from '@/ui/theme';

import { isScreenVisible, sessionRedirect } from './session-redirect';
import { useLocation } from './location';

/**
 * Aplica el guard (`redirect` de go_router): con la ubicación global (path + query) calcula
 * `sessionRedirect` y, si hay destino, reemplaza la pila por él. Reemplaza la pila entera (como
 * `go`): así al salir de la sesión no queda nada protegido debajo del login.
 */
function useGuard({
  appReady,
  hasSession,
  consent,
}: {
  appReady: boolean;
  hasSession: boolean;
  consent: ConsentState;
}) {
  const router = useRouter();
  // Privado/inestable en Expo Router, pero es la única API que da la URL con su query: el
  // `desde` de `/consentimiento` debe conservarla (`/comparar?ids=a,b`).
  const location = useLocation();
  const target = appReady ? sessionRedirect({ hasSession, consent, location }) : null;

  useEffect(() => {
    if (target === null) return;
    if (router.canDismiss()) router.dismissAll();
    router.replace(target as Href);
  }, [target, router]);
}

/**
 * Tabla de rutas de la app (`app_router.dart`): el Stack raíz con las transiciones de §1.4
 * (fade-through en login, consentimiento, pestañas y resultado del pago; zoom en la confirmación;
 * shared-axis horizontal en los flujos, que es lo que queda por defecto) y el guard de sesión y
 * consentimiento.
 *
 * El guard tiene dos partes porque en Expo Router no hay un `redirect` que corra ANTES de
 * construir la pantalla:
 * 1. `screenLayout`: cada pantalla del stack se monta solo si `isScreenVisible` (el redirect no la
 *    sacaría de su ubicación). Mientras tanto se pinta el fondo vacío: una pantalla protegida no
 *    se monta ni carga datos con el consentimiento verificando/pendiente/error (gotcha 3), tampoco
 *    las que quedan debajo en la pila.
 * 2. `useGuard`: navega al destino de `sessionRedirect`.
 *
 * [ready]: fuentes cargadas. Hasta entonces, y mientras se lee la sesión guardada, no se monta
 * ninguna pantalla (la splash sigue visible).
 */
/** Transición de cada ruta del stack raíz (las demás: sharedAxisX). */
const OPTIONS_BY_ROUTE = {
  login: screenOptions.fadeThrough,
  // `PopScope(canPop: false)`: sin gesto atrás en iOS (el botón de Android lo bloquea la vista).
  consentimiento: { ...screenOptions.fadeThrough, gestureEnabled: false },
  '(tabs)': screenOptions.fadeThrough,
  'pago/resultado': screenOptions.fadeThrough,
  'reserva/[bookingId]': screenOptions.zoomIn,
};
type RouteOptions = (typeof OPTIONS_BY_ROUTE)[keyof typeof OPTIONS_BY_ROUTE];
const routeOptions = (name: string): RouteOptions | undefined => (OPTIONS_BY_ROUTE as Record<string, RouteOptions>)[name];

export function AppNavigation({ ready }: { ready: boolean }) {
  const theme = useTheme();
  const session = useSession();
  const { state: consentState } = useConsent();
  const appReady = ready && !session.loading;
  const hasSession = session.userId !== null;

  useGuard({ appReady, hasSession, consent: consentState });

  return (
    <>
      <Stack
        // Opciones por nombre de ruta, sin lista de Stack.Screen: declararlas en otro orden que el
        // canónico de Expo Router despachaba ROUTE_NAMES_CHANGED en cada arranque (error rojo).
        screenOptions={({ route }) => ({
          headerShown: false,
          contentStyle: { backgroundColor: theme.pageBackground },
          ...screenOptions.sharedAxisX,
          ...routeOptions(route.name),
        })}
        screenLayout={({ route, children }) =>
          appReady &&
          isScreenVisible({
            hasSession,
            consent: consentState,
            routeName: route.name,
            params: route.params as Record<string, unknown> | undefined,
          }) ? (
            children
          ) : (
            <View style={{ flex: 1, backgroundColor: theme.pageBackground }} />
          )
        }
      />
      <StatusBar style={theme.brightness === 'dark' ? 'light' : 'dark'} />
    </>
  );
}
