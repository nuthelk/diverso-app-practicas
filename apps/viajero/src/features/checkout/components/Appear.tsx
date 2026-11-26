import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Platform } from 'react-native';

import { Curves, Durations, interval, PageTransitions } from '@/ui/theme';

const STAGGER = 0.14;

/**
 * Entrada escalonada (`aparecer.dart`): cada bloque aparece con un pequeño desplazamiento vertical
 * según su [step], dentro de la misma animación de 640 ms (sin timers): empieza en
 * `clamp(paso × 0.14, 0, 0.72)`, dura `Interval(inicio, inicio + 0.42)` con easeOutCubic, opacidad
 * 0 → 1 y 14 px → 0.
 */
export function Appear({ step, children }: { step: number; children: ReactNode }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const start = Math.min(Math.max(step * STAGGER, 0), 0.72);
    const end = Math.min(Math.max(start + 0.42, 0), 1);
    const animation = Animated.timing(t, {
      toValue: 1,
      duration: Durations.appear,
      easing: interval(start, end, Curves.easeOutCubic.fn),
      useNativeDriver: Platform.OS !== 'web',
    });
    animation.start();
    return () => animation.stop();
  }, [step, t]);
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
export function ElasticScale({ children }: { children: ReactNode }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = Animated.timing(t, {
      toValue: 1,
      duration: Durations.confirmationCheck,
      easing: Curves.elasticOut,
      useNativeDriver: Platform.OS !== 'web',
    });
    animation.start();
    return () => animation.stop();
  }, [t]);
  return <Animated.View style={{ alignSelf: 'center', transform: [{ scale: t }] }}>{children}</Animated.View>;
}

/**
 * Escala de `DiversoPageTransitions.zoomIn` (0.9 → 1 con easeOutBack, 440 ms) para
 * `/reserva/:bookingId`. El stack nativo solo hace el fundido (`screenOptions.zoomIn`): la
 * escala se pone aquí para que la confirmación entre con el mismo «zoom» que en Flutter.
 */
export function ZoomIn({ children, testID }: { children: ReactNode; testID?: string }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = Animated.timing(t, {
      toValue: 1,
      duration: PageTransitions.zoomIn.duration,
      easing: Curves.easeOutBack.fn,
      useNativeDriver: Platform.OS !== 'web',
    });
    animation.start();
    return () => animation.stop();
  }, [t]);
  return (
    <Animated.View testID={testID} style={{ flex: 1, transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] }}>
      {children}
    </Animated.View>
  );
}
