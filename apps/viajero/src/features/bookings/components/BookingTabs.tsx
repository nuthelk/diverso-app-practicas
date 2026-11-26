import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/ui/components';
import { withAlpha, useTheme } from '@/ui/theme';

/**
 * `TabBar` de «Mis reservas» (en el `bottom` del AppBar): dos pestañas a todo el ancho, alto 46,
 * texto titleSmall (14 w500 ls .1) primary la seleccionada y onSurfaceVariant la otra; indicador
 * del ancho del texto (`TabBarIndicatorSize.label`), grosor 2.5, esquinas de arriba redondeadas;
 * sin divisor.
 */
export function BookingTabs({
  tabs,
  selected,
  onChange,
}: {
  tabs: string[];
  selected: number;
  onChange: (index: number) => void;
}) {
  const theme = useTheme();
  const cs = theme.colorScheme;
  return (
    <View accessibilityRole="tablist" style={styles.bar}>
      {tabs.map((text, i) => {
        const active = i === selected;
        const color = active ? cs.primary : cs.onSurfaceVariant;
        return (
          <Pressable
            key={i}
            accessibilityRole="tab"
            accessibilityLabel={text}
            accessibilityState={{ selected: active }}
            onPress={() => onChange(i)}
            style={styles.tab}
          >
            {({ pressed }) => (
              <>
                {pressed ? (
                  <View
                    pointerEvents="none"
                    style={[StyleSheet.absoluteFill, { backgroundColor: withAlpha(color, theme.components.pressedOpacity) }]}
                  />
                ) : null}
                <View style={styles.label}>
                  <Text numberOfLines={1} height={null} style={{ fontSize: 14, fontWeight: '500', letterSpacing: 0.1, color }}>
                    {text}
                  </Text>
                  {active ? <View style={[styles.indicator, { backgroundColor: cs.primary }]} /> : null}
                </View>
              </>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', height: 46 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, overflow: 'hidden' },
  label: { height: '100%', justifyContent: 'center' },
  indicator: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 2.5,
    borderTopLeftRadius: 2.5,
    borderTopRightRadius: 2.5,
  },
});
