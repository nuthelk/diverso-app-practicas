import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/ui/components';
import { withAlpha, useTheme } from '@/ui/theme';

/**
 * `TabBar` de «Mis reservas» (en el `bottom` del AppBar): dos pestañas a todo el ancho, alto 46,
 * texto titleSmall (14 w500 ls .1) primary la seleccionada y onSurfaceVariant la otra; indicador
 * del ancho del texto (`TabBarIndicatorSize.label`), grosor 2.5, esquinas de arriba redondeadas;
 * sin divisor.
 */
export function PestanasReservas({
  pestanas,
  seleccionada,
  onCambio,
}: {
  pestanas: string[];
  seleccionada: number;
  onCambio: (indice: number) => void;
}) {
  const tema = useTheme();
  const cs = tema.colorScheme;
  return (
    <View accessibilityRole="tablist" style={estilos.barra}>
      {pestanas.map((texto, i) => {
        const activa = i === seleccionada;
        const color = activa ? cs.primary : cs.onSurfaceVariant;
        return (
          <Pressable
            key={i}
            accessibilityRole="tab"
            accessibilityLabel={texto}
            accessibilityState={{ selected: activa }}
            onPress={() => onCambio(i)}
            style={estilos.pestana}
          >
            {({ pressed }) => (
              <>
                {pressed ? (
                  <View
                    pointerEvents="none"
                    style={[StyleSheet.absoluteFill, { backgroundColor: withAlpha(color, tema.components.pressedOpacity) }]}
                  />
                ) : null}
                <View style={estilos.etiqueta}>
                  <Text numberOfLines={1} height={null} style={{ fontSize: 14, fontWeight: '500', letterSpacing: 0.1, color }}>
                    {texto}
                  </Text>
                  {activa ? <View style={[estilos.indicador, { backgroundColor: cs.primary }]} /> : null}
                </View>
              </>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  barra: { flexDirection: 'row', height: 46 },
  pestana: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, overflow: 'hidden' },
  etiqueta: { height: '100%', justifyContent: 'center' },
  indicador: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 2.5,
    borderTopLeftRadius: 2.5,
    borderTopRightRadius: 2.5,
  },
});
