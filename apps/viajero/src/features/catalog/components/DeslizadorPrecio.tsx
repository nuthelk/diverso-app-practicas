import { useRef, useState } from 'react';
import { StyleSheet, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';

import { Text } from '@/ui/components';
import { AppText, conAlfa, useTheme } from '@/ui/theme';

const ALTO = 48;
const PULGAR = 20;
const PISTA = 4;

/**
 * `Slider` de Material 3 con divisiones (React Native no trae uno y no se suma una dependencia):
 * pista activa primary, inactiva surfaceContainerHighest, marcas de cada división, pulgar de 20 y
 * burbuja con [etiqueta] mientras se arrastra. Se puede tocar, arrastrar o ajustar con lectores de
 * pantalla (rol `adjustable`: subir/bajar una división).
 */
export function DeslizadorPrecio({
  valor,
  min,
  max,
  divisiones,
  etiqueta,
  onCambio,
  accessibilityLabel,
}: {
  valor: number;
  min: number;
  max: number;
  divisiones: number;
  etiqueta: (valor: number) => string;
  onCambio: (valor: number) => void;
  accessibilityLabel: string;
}) {
  const tema = useTheme();
  const cs = tema.colorScheme;
  const [ancho, setAncho] = useState(0);
  const [arrastrando, setArrastrando] = useState(false);
  const paso = (max - min) / divisiones;
  const fraccion = Math.min(Math.max((valor - min) / (max - min), 0), 1);
  const util = Math.max(ancho - PULGAR, 0);
  const x = PULGAR / 2 + fraccion * util;
  const ultimo = useRef(valor);
  ultimo.current = valor;

  const ajustar = (v: number) => {
    const redondeado = Math.min(Math.max(min + Math.round((v - min) / paso) * paso, min), max);
    if (redondeado !== ultimo.current) onCambio(redondeado);
  };
  const desdeToque = (e: GestureResponderEvent) => {
    if (util <= 0) return;
    const f = Math.min(Math.max((e.nativeEvent.locationX - PULGAR / 2) / util, 0), 1);
    ajustar(min + f * (max - min));
  };

  return (
    <View
      testID="deslizador-precio"
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min, max, now: valor, text: etiqueta(valor) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'increment') ajustar(ultimo.current + paso);
        if (e.nativeEvent.actionName === 'decrement') ajustar(ultimo.current - paso);
      }}
      onLayout={(e: LayoutChangeEvent) => setAncho(e.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={(e) => {
        setArrastrando(true);
        desdeToque(e);
      }}
      onResponderMove={desdeToque}
      onResponderRelease={() => setArrastrando(false)}
      onResponderTerminate={() => setArrastrando(false)}
      style={estilos.caja}
    >
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={[estilos.pista, { left: PULGAR / 2, right: PULGAR / 2, backgroundColor: cs.surfaceContainerHighest }]} />
        <View style={[estilos.pista, { left: PULGAR / 2, width: Math.max(x - PULGAR / 2, 0), backgroundColor: cs.primary }]} />
        {ancho > 0
          ? Array.from({ length: divisiones + 1 }, (_, i) => {
              const xi = PULGAR / 2 + (i / divisiones) * util;
              return (
                <View
                  key={i}
                  style={[
                    estilos.marca,
                    { left: xi - 1, backgroundColor: xi <= x ? conAlfa(cs.onPrimary, 0.38) : conAlfa(cs.onSurfaceVariant, 0.38) },
                  ]}
                />
              );
            })
          : null}
        <View style={[estilos.pulgar, { left: x - PULGAR / 2, backgroundColor: cs.primary }]} />
        {arrastrando ? (
          <View style={[estilos.burbuja, { left: x - 50, backgroundColor: cs.primary }]}>
            <Text numberOfLines={1} style={{ color: cs.onPrimary, fontSize: AppText.leyenda, fontWeight: '600' }}>
              {etiqueta(valor)}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  caja: { height: ALTO, justifyContent: 'center' },
  pista: { position: 'absolute', top: (ALTO - PISTA) / 2, height: PISTA, borderRadius: PISTA / 2 },
  marca: { position: 'absolute', top: (ALTO - 2) / 2, width: 2, height: 2, borderRadius: 1 },
  pulgar: { position: 'absolute', top: (ALTO - PULGAR) / 2, width: PULGAR, height: PULGAR, borderRadius: PULGAR / 2 },
  burbuja: {
    position: 'absolute',
    top: -26,
    width: 100,
    alignItems: 'center',
    borderRadius: 999,
    paddingVertical: 4,
  },
});
