import { useEffect, useRef } from 'react';
import { Animated, type DimensionValue } from 'react-native';

import { Curvas, Duraciones, useTheme } from '@/ui/theme';

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
  const opacidad = useRef(new Animated.Value(0.45)).current;
  useEffect(() => {
    const tramo = (hacia: number) =>
      Animated.timing(opacidad, {
        toValue: hacia,
        duration: Duraciones.skeleton,
        easing: Curvas.easeInOut.fn,
        useNativeDriver: true,
      });
    const pulso = Animated.loop(Animated.sequence([tramo(1), tramo(0.45)]));
    pulso.start();
    return () => pulso.stop();
  }, [opacidad]);
  return (
    <Animated.View
      testID="skeleton"
      style={{
        width,
        alignSelf: width === undefined ? 'stretch' : undefined,
        height,
        borderRadius: radius,
        backgroundColor: base,
        opacity: opacidad,
      }}
    />
  );
}
