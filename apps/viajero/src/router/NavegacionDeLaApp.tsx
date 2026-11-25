import { Stack, useRouter, useUnstableGlobalHref, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';

import { useSesion } from '@/features/auth/view-models/SesionProvider';
import { useConsentimiento } from '@/features/legal/view-models/ConsentimientoProvider';
import type { EstadoConsentimiento } from '@/features/legal/view-models/consent-view-model';
import { opcionesDePantalla, useTheme } from '@/ui/theme';

import { pantallaVisible, sesionRedirect } from './sesion-redirect';

/**
 * Aplica el guard (`redirect` de go_router): con la ubicación global (path + query) calcula
 * `sesionRedirect` y, si hay destino, reemplaza la pila por él. Reemplaza la pila entera (como
 * `go`): así al salir de la sesión no queda nada protegido debajo del login.
 */
function useGuardia({
  preparado,
  haySesion,
  consentimiento,
}: {
  preparado: boolean;
  haySesion: boolean;
  consentimiento: EstadoConsentimiento;
}) {
  const router = useRouter();
  // Privado/inestable en Expo Router, pero es la única API que da la URL con su query: el
  // `desde` de `/consentimiento` debe conservarla (`/comparar?ids=a,b`).
  const ubicacion = useUnstableGlobalHref();
  const destino = preparado ? sesionRedirect({ haySesion, consentimiento, ubicacion }) : null;

  useEffect(() => {
    if (destino === null) return;
    if (router.canDismiss()) router.dismissAll();
    router.replace(destino as Href);
  }, [destino, router]);
}

/**
 * Tabla de rutas de la app (`app_router.dart`): el Stack raíz con las transiciones de §1.4
 * (fade-through en login, consentimiento, pestañas y resultado del pago; zoom en la confirmación;
 * shared-axis horizontal en los flujos, que es lo que queda por defecto) y el guard de sesión y
 * consentimiento.
 *
 * El guard tiene dos partes porque en Expo Router no hay un `redirect` que corra ANTES de
 * construir la pantalla:
 * 1. `screenLayout`: cada pantalla del stack se monta solo si `pantallaVisible` (el redirect no la
 *    sacaría de su ubicación). Mientras tanto se pinta el fondo vacío: una pantalla protegida no
 *    se monta ni carga datos con el consentimiento verificando/pendiente/error (gotcha 3), tampoco
 *    las que quedan debajo en la pila.
 * 2. `useGuardia`: navega al destino de `sesionRedirect`.
 *
 * [listo]: fuentes cargadas. Hasta entonces, y mientras se lee la sesión guardada, no se monta
 * ninguna pantalla (la splash sigue visible).
 */
export function NavegacionDeLaApp({ listo }: { listo: boolean }) {
  const tema = useTheme();
  const sesion = useSesion();
  const { estado } = useConsentimiento();
  const preparado = listo && !sesion.cargando;
  const haySesion = sesion.usuarioId !== null;

  useGuardia({ preparado, haySesion, consentimiento: estado });

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: tema.fondoPagina },
          ...opcionesDePantalla.sharedAxisX,
        }}
        screenLayout={({ route, children }) =>
          preparado &&
          pantallaVisible({
            haySesion,
            consentimiento: estado,
            nombreRuta: route.name,
            params: route.params as Record<string, unknown> | undefined,
          }) ? (
            children
          ) : (
            <View style={{ flex: 1, backgroundColor: tema.fondoPagina }} />
          )
        }
      >
        <Stack.Screen name="login" options={opcionesDePantalla.fadeThrough} />
        {/* `PopScope(canPop: false)`: sin gesto atrás en iOS (el botón de Android lo bloquea la vista). */}
        <Stack.Screen name="consentimiento" options={{ ...opcionesDePantalla.fadeThrough, gestureEnabled: false }} />
        <Stack.Screen name="(tabs)" options={opcionesDePantalla.fadeThrough} />
        <Stack.Screen name="pago/resultado" options={opcionesDePantalla.fadeThrough} />
        <Stack.Screen name="reserva/[bookingId]" options={opcionesDePantalla.zoomIn} />
      </Stack>
      <StatusBar style={tema.brillo === 'dark' ? 'light' : 'dark'} />
    </>
  );
}
