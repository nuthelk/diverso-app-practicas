import { useRef, useState } from 'react';
import { StyleSheet, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';

import { Text } from '@/ui/components';
import { AppText, withAlpha, useTheme } from '@/ui/theme';

const HEIGHT = 48;
const THUMB = 20;
const TRACK = 4;

/**
 * `Slider` de Material 3 con divisiones (React Native no trae uno y no se suma una dependencia):
 * pista activa primary, inactiva surfaceContainerHighest, marcas de cada división, pulgar de 20 y
 * burbuja con [label] mientras se arrastra. Se puede tocar, arrastrar o ajustar con lectores de
 * pantalla (rol `adjustable`: subir/bajar una división).
 */
export function PriceSlider({
  value,
  min,
  max,
  divisions,
  label,
  onChange,
  accessibilityLabel,
}: {
  value: number;
  min: number;
  max: number;
  divisions: number;
  label: (value: number) => string;
  onChange: (value: number) => void;
  accessibilityLabel: string;
}) {
  const theme = useTheme();
  const cs = theme.colorScheme;
  const [width, setWidth] = useState(0);
  const [dragging, setDragging] = useState(false);
  const step = (max - min) / divisions;
  const fraction = Math.min(Math.max((value - min) / (max - min), 0), 1);
  const usableWidth = Math.max(width - THUMB, 0);
  const x = THUMB / 2 + fraction * usableWidth;
  const latestValue = useRef(value);
  latestValue.current = value;

  const adjustTo = (v: number) => {
    const rounded = Math.min(Math.max(min + Math.round((v - min) / step) * step, min), max);
    if (rounded !== latestValue.current) onChange(rounded);
  };
  const fromTouch = (e: GestureResponderEvent) => {
    if (usableWidth <= 0) return;
    const f = Math.min(Math.max((e.nativeEvent.locationX - THUMB / 2) / usableWidth, 0), 1);
    adjustTo(min + f * (max - min));
  };

  return (
    <View
      testID="price-slider"
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min, max, now: value, text: label(value) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'increment') adjustTo(latestValue.current + step);
        if (e.nativeEvent.actionName === 'decrement') adjustTo(latestValue.current - step);
      }}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={(e) => {
        setDragging(true);
        fromTouch(e);
      }}
      onResponderMove={fromTouch}
      onResponderRelease={() => setDragging(false)}
      onResponderTerminate={() => setDragging(false)}
      style={styles.box}
    >
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={[styles.track, { left: THUMB / 2, right: THUMB / 2, backgroundColor: cs.surfaceContainerHighest }]} />
        <View style={[styles.track, { left: THUMB / 2, width: Math.max(x - THUMB / 2, 0), backgroundColor: cs.primary }]} />
        {width > 0
          ? Array.from({ length: divisions + 1 }, (_, i) => {
              const xi = THUMB / 2 + (i / divisions) * usableWidth;
              return (
                <View
                  key={i}
                  style={[
                    styles.tick,
                    { left: xi - 1, backgroundColor: xi <= x ? withAlpha(cs.onPrimary, 0.38) : withAlpha(cs.onSurfaceVariant, 0.38) },
                  ]}
                />
              );
            })
          : null}
        <View style={[styles.thumb, { left: x - THUMB / 2, backgroundColor: cs.primary }]} />
        {dragging ? (
          <View style={[styles.bubble, { left: x - 50, backgroundColor: cs.primary }]}>
            <Text numberOfLines={1} style={{ color: cs.onPrimary, fontSize: AppText.caption, fontWeight: '600' }}>
              {label(value)}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { height: HEIGHT, justifyContent: 'center' },
  track: { position: 'absolute', top: (HEIGHT - TRACK) / 2, height: TRACK, borderRadius: TRACK / 2 },
  tick: { position: 'absolute', top: (HEIGHT - 2) / 2, width: 2, height: 2, borderRadius: 1 },
  thumb: { position: 'absolute', top: (HEIGHT - THUMB) / 2, width: THUMB, height: THUMB, borderRadius: THUMB / 2 },
  bubble: {
    position: 'absolute',
    top: -26,
    width: 100,
    alignItems: 'center',
    borderRadius: 999,
    paddingVertical: 4,
  },
});
