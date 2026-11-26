import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing } from 'react-native';

import { DiversoLogo } from '@/ui/components';

/**
 * El colibrí de la marca, grande y sin fondo, que llega volando una sola vez al abrir el acceso
 * (un tramo corto en diagonal que se frena, como cuando se detiene frente a una flor). Es el único
 * movimiento de la pantalla. Con «reducir movimiento» del sistema aparece quieto.
 */
export function WelcomeHummingbird({ size, color }: { size: number; color: string }) {
  const arrival = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (cancelled) return;
      if (reduceMotion) {
        arrival.setValue(1);
        return;
      }
      Animated.timing(arrival, {
        toValue: 1,
        duration: 700,
        easing: Easing.bezier(0.05, 0.7, 0.1, 1), // emphasized decelerate de M3
        useNativeDriver: true,
      }).start();
    });
    return () => {
      cancelled = true;
      arrival.stopAnimation();
    };
  }, [arrival]);

  return (
    <Animated.View
      testID="welcome-hummingbird"
      style={{
        opacity: arrival,
        transform: [
          { translateX: arrival.interpolate({ inputRange: [0, 1], outputRange: [-size * 0.35, 0] }) },
          { translateY: arrival.interpolate({ inputRange: [0, 1], outputRange: [size * 0.18, 0] }) },
          { rotate: arrival.interpolate({ inputRange: [0, 1], outputRange: ['-10deg', '0deg'] }) },
        ],
      }}
    >
      <DiversoLogo size={size} color={color} />
    </Animated.View>
  );
}
