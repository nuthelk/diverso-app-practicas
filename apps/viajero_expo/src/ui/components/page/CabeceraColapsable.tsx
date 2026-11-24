import { useRef, useState, type ReactNode } from 'react';
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

const ALTO_BARRA = 56; // kToolbarHeight

/** Medidas de la cabecera para un desplazamiento dado (`_FondoSolido` + `FlexibleSpaceBar`). */
export function medidasCabecera(desplazamiento: number, alturaExpandida: number, alturaMinima: number) {
  const rango = alturaExpandida - alturaMinima;
  const d = Math.min(Math.max(desplazamiento, 0), Math.max(rango, 0));
  const colapso = rango <= 0 ? 1 : Math.min(Math.max(d / rango, 0), 1);
  const solido = Math.min(Math.max((colapso - 0.6) / 0.4, 0), 1);
  // FlexibleSpaceBar: la foto se funde a partir de 1 - 2×toolbar/rango y sube a 1/4 (parallax).
  const inicioFundido = rango > 0 ? Math.max(0, 1 - (ALTO_BARRA * 2) / rango) : 0;
  const opacidadFoto =
    colapso <= inicioFundido ? 1 : 1 - Math.min(1, (colapso - inicioFundido) / (1 - inicioFundido || 1));
  return {
    colapso,
    solido,
    alturaVisible: alturaExpandida - d,
    opacidadFoto,
    desplazamientoFoto: -d / 4,
  };
}

/**
 * Cabecera colapsable con foto (ficha del plan 300, agencia 220, detalle de reserva 240): con la
 * foto a la vista, «Volver» flota sobre ella (`IconButton.filled` negro 45 %, ícono blanco 20);
 * al desplazarse termina SÓLIDA del color de la página, con [titulo] (19 w800 ls -.4, de 64 a
 * 20, una línea) y un divisor outlineVariant abajo. La capa sólida aparece desde el 60 % de
 * colapso. Es dueña del scroll: el contenido va en `children` y arranca bajo la cabecera.
 */
export function CabeceraColapsable({
  titulo,
  fondo,
  onVolver,
  alturaExpandida = 260,
  children,
  scrollViewProps,
}: {
  titulo: string;
  fondo: ReactNode;
  onVolver: () => void;
  alturaExpandida?: number;
  children?: ReactNode;
  /** Props extra del ScrollView (refreshControl, contentContainerStyle adicional…). */
  scrollViewProps?: Omit<ScrollViewProps, 'onScroll' | 'children'>;
}) {
  const tema = useTheme();
  const insets = useSafeAreaInsets();
  const alturaMinima = ALTO_BARRA + insets.top;
  const rango = Math.max(alturaExpandida - alturaMinima, 1);
  const y = useRef(new Animated.Value(0)).current;
  const [conCapaSolida, setConCapaSolida] = useState(false);

  const desplazado = y.interpolate({ inputRange: [0, rango], outputRange: [0, rango], extrapolate: 'clamp' });
  const subir = Animated.multiply(desplazado, -1);
  const inicioFundido = Math.max(0, 1 - (ALTO_BARRA * 2) / rango);
  const opacidadFoto = y.interpolate({
    inputRange: [inicioFundido * rango, rango],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const opacidadSolida = y.interpolate({ inputRange: [0.6 * rango, rango], outputRange: [0, 1], extrapolate: 'clamp' });

  const alDesplazar = Animated.event([{ nativeEvent: { contentOffset: { y } } }], {
    useNativeDriver: true,
    listener: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const solida = medidasCabecera(e.nativeEvent.contentOffset.y, alturaExpandida, alturaMinima).solido > 0;
      setConCapaSolida((antes) => (antes === solida ? antes : solida));
    },
  });

  const { contentContainerStyle, ...restoScroll } = scrollViewProps ?? {};

  return (
    <View style={[estilos.flex, { backgroundColor: tema.fondoPagina }]}>
      <Animated.ScrollView
        testID="cabecera-scroll"
        scrollEventThrottle={16}
        {...restoScroll}
        onScroll={alDesplazar}
        contentContainerStyle={StyleSheet.flatten([{ paddingTop: alturaExpandida }, contentContainerStyle])}
      >
        {children}
      </Animated.ScrollView>

      {/* Cabecera: sube con el scroll hasta dejar visible solo la altura mínima. */}
      <Animated.View
        pointerEvents="box-none"
        style={[
          estilos.cabecera,
          { height: alturaExpandida, backgroundColor: tema.fondoPagina, transform: [{ translateY: subir }] },
        ]}
      >
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              opacity: opacidadFoto,
              // La foto queda a -d/4 en pantalla: dentro de la cabecera (que sube d), baja 3d/4.
              transform: [{ translateY: Animated.multiply(desplazado, 0.75) }],
            },
          ]}
        >
          {fondo}
        </Animated.View>
        {conCapaSolida ? (
          <Animated.View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { opacity: opacidadSolida, backgroundColor: tema.fondoPagina }]}
          >
            <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateY: desplazado }] }]}>
              <View
                testID="cabecera-titulo-caja"
                style={{ position: 'absolute', left: 64, right: 20, top: insets.top, height: ALTO_BARRA, justifyContent: 'center' }}
              >
                <Text
                  testID="cabecera-titulo"
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  style={{ fontSize: AppText.encabezadoXs, fontWeight: '800', letterSpacing: -0.4, color: tema.colorScheme.onSurface }}
                >
                  {titulo}
                </Text>
              </View>
            </Animated.View>
            <View style={[estilos.divisor, { backgroundColor: tema.colorScheme.outlineVariant }]} />
          </Animated.View>
        ) : null}
      </Animated.View>

      {/* «Volver» fijo, sobre la foto o sobre la barra sólida. */}
      <View style={[estilos.volver, { top: insets.top + 8 }]}>
        <IconButton
          variante="filled"
          icono="arrow_back_rounded"
          tamanoIcono={20}
          colorFondo="rgba(0, 0, 0, 0.45)"
          colorIcono="#FFFFFF"
          tooltip="Volver"
          onPress={onVolver}
        />
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  flex: { flex: 1 },
  cabecera: { position: 'absolute', top: 0, left: 0, right: 0, overflow: 'hidden' },
  divisor: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 1 },
  volver: { position: 'absolute', left: 8 },
});
