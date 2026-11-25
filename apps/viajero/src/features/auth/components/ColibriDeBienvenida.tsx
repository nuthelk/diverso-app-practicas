import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing } from 'react-native';

import { DiversoLogo } from '@/ui/components';

/**
 * El colibrí de la marca, grande y sin fondo, que llega volando una sola vez al abrir el acceso
 * (un tramo corto en diagonal que se frena, como cuando se detiene frente a una flor). Es el único
 * movimiento de la pantalla. Con «reducir movimiento» del sistema aparece quieto.
 */
export function ColibriDeBienvenida({ size, color }: { size: number; color: string }) {
  const llegada = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelado = false;
    void AccessibilityInfo.isReduceMotionEnabled().then((reducir) => {
      if (cancelado) return;
      if (reducir) {
        llegada.setValue(1);
        return;
      }
      Animated.timing(llegada, {
        toValue: 1,
        duration: 700,
        easing: Easing.bezier(0.05, 0.7, 0.1, 1), // emphasized decelerate de M3
        useNativeDriver: true,
      }).start();
    });
    return () => {
      cancelado = true;
      llegada.stopAnimation();
    };
  }, [llegada]);

  return (
    <Animated.View
      testID="colibri-bienvenida"
      style={{
        opacity: llegada,
        transform: [
          { translateX: llegada.interpolate({ inputRange: [0, 1], outputRange: [-size * 0.35, 0] }) },
          { translateY: llegada.interpolate({ inputRange: [0, 1], outputRange: [size * 0.18, 0] }) },
          { rotate: llegada.interpolate({ inputRange: [0, 1], outputRange: ['-10deg', '0deg'] }) },
        ],
      }}
    >
      <DiversoLogo size={size} color={color} />
    </Animated.View>
  );
}
