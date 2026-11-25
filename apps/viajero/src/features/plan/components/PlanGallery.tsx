import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Curves, Durations, useTheme } from '@/ui/theme';

/**
 * Fondo de la cabecera de la ficha: sin fotos, primaryContainer; con fotos, una galería que se
 * desliza de lado (sin indicador de página, como en Flutter) y entra con un leve zoom
 * (escala 1.06 → 1 en 900 ms easeOutCubic).
 */
export function PlanGallery({ photos }: { photos: readonly string[] }) {
  const cs = useTheme().colorScheme;
  const { width } = useWindowDimensions();
  const scale = useRef(new Animated.Value(1.06)).current;
  useEffect(() => {
    const animation = Animated.timing(scale, {
      toValue: 1,
      duration: Durations.gallery,
      easing: Curves.easeOutCubic.fn,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [scale]);

  if (photos.length === 0) {
    return <View testID="galeria-vacia" style={[StyleSheet.absoluteFill, { backgroundColor: cs.primaryContainer }]} />;
  }
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scale }] }]}>
      <ScrollView testID="galeria-plan" horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={StyleSheet.absoluteFill}>
        {photos.map((url, i) => (
          <GalleryPhoto key={`${i}-${url}`} url={url} width={width} />
        ))}
      </ScrollView>
    </Animated.View>
  );
}

function GalleryPhoto({ url, width }: { url: string; width: number }) {
  const cs = useTheme().colorScheme;
  const [failed, setFailed] = useState(false);
  return (
    <View style={{ width, height: '100%', backgroundColor: cs.primaryContainer }}>
      {failed ? null : (
        <Image source={{ uri: url }} contentFit="cover" style={StyleSheet.absoluteFill} onError={() => setFailed(true)} accessible={false} />
      )}
    </View>
  );
}
