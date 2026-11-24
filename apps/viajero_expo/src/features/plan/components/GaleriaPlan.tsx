import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Curvas, Duraciones, useTheme } from '@/ui/theme';

/**
 * Fondo de la cabecera de la ficha: sin fotos, primaryContainer; con fotos, una galería que se
 * desliza de lado (sin indicador de página, como en Flutter) y entra con un leve zoom
 * (escala 1.06 → 1 en 900 ms easeOutCubic).
 */
export function GaleriaPlan({ fotos }: { fotos: readonly string[] }) {
  const cs = useTheme().colorScheme;
  const { width } = useWindowDimensions();
  const escala = useRef(new Animated.Value(1.06)).current;
  useEffect(() => {
    const animacion = Animated.timing(escala, {
      toValue: 1,
      duration: Duraciones.galeria,
      easing: Curvas.easeOutCubic.fn,
      useNativeDriver: true,
    });
    animacion.start();
    return () => animacion.stop();
  }, [escala]);

  if (fotos.length === 0) {
    return <View testID="galeria-vacia" style={[StyleSheet.absoluteFill, { backgroundColor: cs.primaryContainer }]} />;
  }
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scale: escala }] }]}>
      <ScrollView testID="galeria-plan" horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={StyleSheet.absoluteFill}>
        {fotos.map((url, i) => (
          <FotoGaleria key={`${i}-${url}`} url={url} ancho={width} />
        ))}
      </ScrollView>
    </Animated.View>
  );
}

function FotoGaleria({ url, ancho }: { url: string; ancho: number }) {
  const cs = useTheme().colorScheme;
  const [fallo, setFallo] = useState(false);
  return (
    <View style={{ width: ancho, height: '100%', backgroundColor: cs.primaryContainer }}>
      {fallo ? null : (
        <Image source={{ uri: url }} contentFit="cover" style={StyleSheet.absoluteFill} onError={() => setFallo(true)} accessible={false} />
      )}
    </View>
  );
}
