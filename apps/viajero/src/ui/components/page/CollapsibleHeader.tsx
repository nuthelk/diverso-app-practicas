import { useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, useTheme } from '@/ui/theme';

import { IconButton } from '../material/Botones';
import { Text } from '../Text';

const BAR_HEIGHT = 56; // kToolbarHeight

/**
 * Scrim superior: negro 35 % → transparente detrás de la barra de estado y de «Volver», para que
 * la hora, la batería y el botón se lean sobre fotos claras (cielo). `backgroundImage` es estable
 * en React Native 0.88 y sirve igual en web (como en `PlanCard`).
 */
const CSS_SCRIM = 'linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 100%)';
/** Lo que baja el degradado por debajo de la fila de «Volver» para fundirse sin corte. */
const SCRIM_TAIL = 16;

/** Medidas de la cabecera para un desplazamiento dado (`_FondoSolido` + `FlexibleSpaceBar`). */
export function headerMetrics(offset: number, expandedHeight: number, minHeight: number) {
  const range = expandedHeight - minHeight;
  const d = Math.min(Math.max(offset, 0), Math.max(range, 0));
  const collapse = range <= 0 ? 1 : Math.min(Math.max(d / range, 0), 1);
  const solid = Math.min(Math.max((collapse - 0.6) / 0.4, 0), 1);
  // FlexibleSpaceBar: la foto se funde a partir de 1 - 2×toolbar/rango y sube a 1/4 (parallax).
  const fadeStart = range > 0 ? Math.max(0, 1 - (BAR_HEIGHT * 2) / range) : 0;
  const photoOpacity =
    collapse <= fadeStart ? 1 : 1 - Math.min(1, (collapse - fadeStart) / (1 - fadeStart || 1));
  return {
    collapse,
    solid,
    visibleHeight: expandedHeight - d,
    photoOpacity,
    photoOffset: -d / 4,
  };
}

/**
 * Cabecera colapsable con foto (ficha del plan 300, agencia 220, detalle de reserva 240): con la
 * foto a la vista, «Volver» flota sobre ella (`IconButton.filled` negro 45 %, ícono blanco 20);
 * al desplazarse termina SÓLIDA del color de la página, con [title] (19 w800 ls -.4, de 64 a
 * 20, una línea) y un divisor outlineVariant abajo. La capa sólida aparece desde el 60 % de
 * colapso. Es dueña del scroll: el contenido va en `children` y arranca bajo la cabecera.
 *
 * Mientras la foto está a la vista hay un scrim arriba y la barra de estado pasa a contenido
 * CLARO (solo con la pantalla enfocada: si otra pantalla se apila encima, vuelve la de la app);
 * al colapsar, la cabecera queda sólida y la barra de estado vuelve a la del tema.
 */
export function CollapsibleHeader({
  title,
  background,
  onBack,
  expandedHeight = 260,
  children,
  scrollViewProps,
}: {
  title: string;
  background: ReactNode;
  onBack: () => void;
  expandedHeight?: number;
  children?: ReactNode;
  /** Props extra del ScrollView (refreshControl, contentContainerStyle adicional…). */
  scrollViewProps?: Omit<ScrollViewProps, 'onScroll' | 'children'>;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const minHeight = BAR_HEIGHT + insets.top;
  const range = Math.max(expandedHeight - minHeight, 1);
  const y = useRef(new Animated.Value(0)).current;
  const [hasSolidLayer, setHasSolidLayer] = useState(false);
  const [photoVisible, setPhotoVisible] = useState(true);
  const [focused, setFocused] = useState(false);

  // La barra de estado de RN es una pila: si esta pantalla queda debajo de otra (p. ej. el
  // checkout sobre la ficha), su barra clara no puede seguir mandando.
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );

  const scrolled = y.interpolate({ inputRange: [0, range], outputRange: [0, range], extrapolate: 'clamp' });
  const lift = Animated.multiply(scrolled, -1);
  const fadeStart = Math.max(0, 1 - (BAR_HEIGHT * 2) / range);
  const photoOpacity = y.interpolate({
    inputRange: [fadeStart * range, range],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const solidOpacity = y.interpolate({ inputRange: [0.6 * range, range], outputRange: [0, 1], extrapolate: 'clamp' });

  const handleScroll = Animated.event([{ nativeEvent: { contentOffset: { y } } }], {
    useNativeDriver: true,
    listener: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { solid } = headerMetrics(e.nativeEvent.contentOffset.y, expandedHeight, minHeight);
      const isSolid = solid > 0;
      setHasSolidLayer((prev) => (prev === isSolid ? prev : isSolid));
      // Hasta la mitad del fundido a sólido manda la foto (iconos claros); después, el tema.
      const photo = solid < 0.5;
      setPhotoVisible((prev) => (prev === photo ? prev : photo));
    },
  });

  const { contentContainerStyle, ...restScroll } = scrollViewProps ?? {};

  return (
    <View style={[styles.flex, { backgroundColor: theme.pageBackground }]}>
      {focused && photoVisible ? <StatusBar style="light" /> : null}
      <Animated.ScrollView
        testID="cabecera-scroll"
        scrollEventThrottle={16}
        {...restScroll}
        onScroll={handleScroll}
        contentContainerStyle={StyleSheet.flatten([{ paddingTop: expandedHeight }, contentContainerStyle])}
      >
        {children}
      </Animated.ScrollView>

      {/* Cabecera: sube con el scroll hasta dejar visible solo la altura mínima. */}
      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.header,
          { height: expandedHeight, backgroundColor: theme.pageBackground, transform: [{ translateY: lift }] },
        ]}
      >
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              opacity: photoOpacity,
              // La foto queda a -d/4 en pantalla: dentro de la cabecera (que sube d), baja 3d/4.
              transform: [{ translateY: Animated.multiply(scrolled, 0.75) }],
            },
          ]}
        >
          {background}
        </Animated.View>
        {/* Scrim fijo arriba (compensa lo que sube la cabecera); se funde con la foto y la capa
            sólida lo tapa al colapsar. */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.scrim,
            {
              height: insets.top + BAR_HEIGHT + SCRIM_TAIL,
              opacity: photoOpacity,
              transform: [{ translateY: scrolled }],
            },
          ]}
        />
        {hasSolidLayer ? (
          <Animated.View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { opacity: solidOpacity, backgroundColor: theme.pageBackground }]}
          >
            <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateY: scrolled }] }]}>
              <View
                testID="cabecera-titulo-caja"
                style={{ position: 'absolute', left: 64, right: 20, top: insets.top, height: BAR_HEIGHT, justifyContent: 'center' }}
              >
                <Text
                  testID="cabecera-titulo"
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  style={{ fontSize: AppText.headingXs, fontWeight: '800', letterSpacing: -0.4, color: theme.colorScheme.onSurface }}
                >
                  {title}
                </Text>
              </View>
            </Animated.View>
            <View style={[styles.divider, { backgroundColor: theme.colorScheme.outlineVariant }]} />
          </Animated.View>
        ) : null}
      </Animated.View>

      {/* «Volver» fijo, sobre la foto o sobre la barra sólida. */}
      <View style={[styles.back, { top: insets.top + 8 }]}>
        <IconButton
          variant="filled"
          icon="arrow_back_rounded"
          iconSize={20}
          backgroundColor="rgba(0, 0, 0, 0.45)"
          iconColor="#FFFFFF"
          tooltip="Volver"
          onPress={onBack}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { position: 'absolute', top: 0, left: 0, right: 0, overflow: 'hidden' },
  divider: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 1 },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, backgroundImage: CSS_SCRIM },
  back: { position: 'absolute', left: 8 },
});
