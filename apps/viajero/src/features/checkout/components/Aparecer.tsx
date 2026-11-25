import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Platform } from 'react-native';

import { Curvas, Duraciones, intervalo, TransicionesDePagina } from '@/ui/theme';

const ESCALON = 0.14;

/**
 * Entrada escalonada (`aparecer.dart`): cada bloque aparece con un pequeño desplazamiento vertical
 * según su [paso], dentro de la misma animación de 640 ms (sin timers): empieza en
 * `clamp(paso × 0.14, 0, 0.72)`, dura `Interval(inicio, inicio + 0.42)` con easeOutCubic, opacidad
 * 0 → 1 y 14 px → 0.
 */
export function Aparecer({ paso, children }: { paso: number; children: ReactNode }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const inicio = Math.min(Math.max(paso * ESCALON, 0), 0.72);
    const fin = Math.min(Math.max(inicio + 0.42, 0), 1);
    const animacion = Animated.timing(t, {
      toValue: 1,
      duration: Duraciones.aparecer,
      easing: intervalo(inicio, fin, Curvas.easeOutCubic.fn),
      useNativeDriver: Platform.OS !== 'web',
    });
    animacion.start();
    return () => animacion.stop();
  }, [paso, t]);
  return (
    <Animated.View
      style={{
        opacity: t,
        transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
      }}
    >
      {children}
    </Animated.View>
  );
}

/**
 * Check de la confirmación: escala 0 → 1 en 380 ms con `Curves.elasticOut`
 * (`TweenAnimationBuilder` de `booking_success_view.dart`).
 */
export function EscalaElastica({ children }: { children: ReactNode }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animacion = Animated.timing(t, {
      toValue: 1,
      duration: Duraciones.checkConfirmacion,
      easing: Curvas.elasticOut,
      useNativeDriver: Platform.OS !== 'web',
    });
    animacion.start();
    return () => animacion.stop();
  }, [t]);
  return <Animated.View style={{ alignSelf: 'center', transform: [{ scale: t }] }}>{children}</Animated.View>;
}

/**
 * Escala de `DiversoPageTransitions.zoomIn` (0.9 → 1 con easeOutBack, 440 ms) para
 * `/reserva/:bookingId`. El stack nativo solo hace el fundido (`opcionesDePantalla.zoomIn`): la
 * escala se pone aquí para que la confirmación entre con el mismo «zoom» que en Flutter.
 */
export function EntradaZoom({ children, testID }: { children: ReactNode; testID?: string }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animacion = Animated.timing(t, {
      toValue: 1,
      duration: TransicionesDePagina.zoomIn.duracion,
      easing: Curvas.easeOutBack.fn,
      useNativeDriver: Platform.OS !== 'web',
    });
    animacion.start();
    return () => animacion.stop();
  }, [t]);
  return (
    <Animated.View testID={testID} style={{ flex: 1, transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] }}>
      {children}
    </Animated.View>
  );
}
