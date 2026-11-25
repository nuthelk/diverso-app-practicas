import { useEffect, useRef } from 'react';
import { Animated, type DimensionValue } from 'react-native';

import { Curves, Durations, useTheme } from '@/ui/theme';

/**
 * Placeholder de carga con pulso: caja surfaceContainerHigh que va de opacidad .45 a 1 y vuelve
 * (1100 ms cada tramo, easeInOut, `repeat(reverse: true)`). Sin `width` ocupa el ancho disponible.
 */
export function Skeleton({
  width,
  height = 16,
  radius = 10,
}: {
  width?: DimensionValue;
  height?: number;
  radius?: number;
}) {
  const base = useTheme().colorScheme.surfaceContainerHigh;
  const opacity = useRef(new Animated.Value(0.45)).current;
  useEffect(() => {
    const step = (target: number) =>
      Animated.timing(opacity, {
        toValue: target,
        duration: Durations.skeleton,
        easing: Curves.easeInOut.fn,
        useNativeDriver: true,
      });
    const pulse = Animated.loop(Animated.sequence([step(1), step(0.45)]));
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);
  return (
    <Animated.View
      testID="skeleton"
      style={{
        width,
        alignSelf: width === undefined ? 'stretch' : undefined,
        height,
        borderRadius: radius,
        backgroundColor: base,
        opacity,
      }}
    />
  );
}
