import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { EMOJI_EXPERIENCE_CATEGORY, type Plan } from '@/core';
import { FilledButton, Icono, IconButton, Text, TextButton } from '@/ui/components';
import { AppRadios, AppText, conAlfa, Curvas, Duraciones, Sombras, useTheme } from '@/ui/theme';

/** Desde cuántos planes se puede comparar. */
export const MINIMO_COMPARAR = 2;

const ALTO_MINIATURA = 52;

interface PropsBandeja {
  seleccion: readonly Plan[];
  maximo: number;
  onQuitar: (plan: Plan) => void;
  onLimpiar: () => void;
  onComparar: () => void;
}

/**
 * Bandeja de comparación con su animación (`AnimatedSwitcher` 220 ms: entra easeOutCubic, sale
 * easeInCubic, crece desde arriba + fundido). Sin selección no hay bandeja. Va DEBAJO de la lista
 * (no flota encima): la lista termina donde empieza la bandeja (gotcha 14).
 */
export function BandejaAnimada(props: PropsBandeja) {
  const hay = props.seleccion.length > 0;
  const t = useRef(new Animated.Value(hay ? 1 : 0)).current;
  // Mientras sale se sigue pintando la última selección.
  const ultima = useRef(props);
  if (hay) ultima.current = props;
  const [saliendo, setSaliendo] = useState(false);
  const [alto, setAlto] = useState(0);
  const habia = useRef(hay);

  useEffect(() => {
    if (habia.current === hay) return;
    habia.current = hay;
    const animacion = Animated.timing(t, {
      toValue: hay ? 1 : 0,
      duration: Duraciones.bandejaComparar,
      easing: (hay ? Curvas.easeOutCubic : Curvas.easeInCubic).fn,
      useNativeDriver: false,
    });
    setSaliendo(!hay);
    animacion.start(({ finished }) => {
      if (finished && !hay) setSaliendo(false);
    });
    return () => animacion.stop();
  }, [hay, t]);

  if (!hay && !saliendo) return null;
  return (
    <Animated.View
      style={{
        opacity: t,
        // SizeTransition desde arriba: el alto crece de 0 al de la bandeja.
        height: alto > 0 ? t.interpolate({ inputRange: [0, 1], outputRange: [0, alto] }) : undefined,
        overflow: 'hidden',
      }}
    >
      <View onLayout={(e) => setAlto(e.nativeEvent.layout.height)}>
        <BandejaComparar {...ultima.current} />
      </View>
    </Animated.View>
  );
}

/**
 * Bandeja de comparación (`bandeja_comparar.dart`): contador, pista, «Limpiar», una miniatura por
 * plan elegido (foto + título, con ✕), lugares libres y «Comparar (n)», habilitado desde 2.
 */
export function BandejaComparar({ seleccion, maximo, onQuitar, onLimpiar, onComparar }: PropsBandeja) {
  const tema = useTheme();
  const cs = tema.colorScheme;
  const n = seleccion.length;
  const puede = n >= MINIMO_COMPARAR;
  const pista = !puede ? `Elige al menos ${MINIMO_COMPARAR} planes` : n >= maximo ? `Máximo ${maximo} planes` : null;

  return (
    <View
      testID="bandeja-comparar"
      style={[
        estilos.bandeja,
        Sombras.bandeja,
        {
          backgroundColor: cs.surfaceContainerLowest,
          // Borde sutil además de la sombra: en oscuro la sombra casi no se ve.
          borderColor: conAlfa(cs.outlineVariant, 0.6),
          // Sin inset inferior: la barra de pestañas va debajo y ya consume el de la barra de gestos.
          paddingBottom: 14,
        },
      ]}
    >
      <View style={estilos.fila}>
        <View style={estilos.flex}>
          <Text style={{ fontSize: AppText.enfasis, fontWeight: '800', letterSpacing: -0.2 }}>{`${n} de ${maximo} planes`}</Text>
          {pista ? <Text style={{ fontSize: AppText.leyendaGrande, color: cs.onSurfaceVariant }}>{pista}</Text> : null}
        </View>
        <TextButton texto="Limpiar" onPress={onLimpiar} />
      </View>
      <View style={{ height: 8 }} />
      <View style={estilos.fila}>
        <View style={[estilos.flex, estilos.fila, { alignItems: 'flex-start' }]}>
          {Array.from({ length: maximo }, (_, i) => {
            const plan = seleccion[i];
            return (
              <View key={plan ? plan.id : `hueco-${i}`} style={[estilos.flex, i > 0 ? { marginLeft: 8 } : null]}>
                {plan ? <Miniatura plan={plan} onQuitar={() => onQuitar(plan)} /> : <Hueco />}
              </View>
            );
          })}
        </View>
        <View style={{ width: 12 }} />
        <FilledButton texto={`Comparar (${n})`} onPress={puede ? onComparar : null} testID="boton-comparar" />
      </View>
    </View>
  );
}

/** Foto del plan con su ✕ y el título corto debajo. */
function Miniatura({ plan, onQuitar }: { plan: Plan; onQuitar: () => void }) {
  const tema = useTheme();
  const cs = tema.colorScheme;
  const [fallo, setFallo] = useState(false);
  const foto = plan.fotoPrincipal;
  return (
    <View>
      <View testID="foto-miniatura" style={[estilos.miniatura, { height: ALTO_MINIATURA }]}>
        {foto === null || fallo ? (
          <View style={[StyleSheet.absoluteFill, estilos.centro, { backgroundColor: cs.primaryContainer }]}>
            <Text style={{ fontSize: AppText.encabezadoS }}>{EMOJI_EXPERIENCE_CATEGORY[plan.categoria]}</Text>
          </View>
        ) : (
          <Image source={{ uri: foto }} contentFit="cover" style={StyleSheet.absoluteFill} onError={() => setFallo(true)} accessible={false} />
        )}
        <View style={estilos.quitar}>
          <IconButton
            variante="filled"
            icono="close_rounded"
            tamanoIcono={14}
            tooltip={`Quitar ${plan.titulo} de la comparación`}
            colorFondo={tema.diverso.controlSobreFoto}
            colorIcono="#FFFFFF"
            style={estilos.quitarBoton}
            onPress={onQuitar}
          />
        </View>
      </View>
      <View style={{ height: 4 }} />
      <Text numberOfLines={1} altura={1.2} style={{ fontSize: AppText.etiqueta, fontWeight: '600' }}>
        {plan.titulo}
      </Text>
    </View>
  );
}

/** Lugar libre (deja ver cuántos caben): del tamaño de una miniatura y decorativo. */
function Hueco() {
  const cs = useTheme().colorScheme;
  return (
    <View testID="hueco" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View
        testID="hueco-bandeja"
        style={[
          estilos.miniatura,
          estilos.centro,
          {
            height: ALTO_MINIATURA,
            backgroundColor: conAlfa(cs.surfaceContainerHigh, 0.4),
            borderWidth: 1,
            borderColor: cs.outlineVariant,
          },
        ]}
      >
        <Icono nombre="add_rounded" size={20} color={cs.outline} />
      </View>
      <View style={{ height: 4 + 14 }} />
    </View>
  );
}

const estilos = StyleSheet.create({
  bandeja: {
    borderTopLeftRadius: AppRadios.card,
    borderTopRightRadius: AppRadios.card,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: 10,
  },
  fila: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  centro: { alignItems: 'center', justifyContent: 'center' },
  miniatura: { borderRadius: AppRadios.control, overflow: 'hidden' },
  quitar: { position: 'absolute', top: 2, right: 2 },
  quitarBoton: { width: 24, height: 24, borderRadius: 12 },
});
