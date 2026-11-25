import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';

import { LABEL_EXPERIENCE_CATEGORY, type ExperienceCategory } from '@/core';
import { Icon, Text, type IconName } from '@/ui/components';
import { AppRadii, AppText, Curves, Durations, useTheme } from '@/ui/theme';

const ICONOS: Record<ExperienceCategory, IconName> = {
  aventura: 'hiking_rounded',
  naturaleza: 'forest_rounded',
  cultura: 'account_balance_rounded',
  gastronomia: 'restaurant_rounded',
  relax: 'spa_rounded',
  urbano: 'location_city_rounded',
};

/**
 * Chip de una categoría del catálogo (`chip_categoria.dart`): píldora; seleccionada con fondo y
 * borde primary y contenido onPrimary; si no, transparente con borde outlineVariant. El cambio de
 * color se anima 180 ms easeOut.
 */
export function ChipCategoria({
  categoria,
  seleccionada,
  onPress,
}: {
  categoria: ExperienceCategory;
  seleccionada: boolean;
  onPress: () => void;
}) {
  const cs = useTheme().colorScheme;
  const t = useRef(new Animated.Value(seleccionada ? 1 : 0)).current;
  useEffect(() => {
    const animacion = Animated.timing(t, {
      toValue: seleccionada ? 1 : 0,
      duration: Durations.categoryChip,
      easing: Curves.easeOut.fn,
      useNativeDriver: false,
    });
    animacion.start();
    return () => animacion.stop();
  }, [seleccionada, t]);
  const contenido = seleccionada ? cs.onPrimary : cs.onSurfaceVariant;
  const etiqueta = LABEL_EXPERIENCE_CATEGORY[categoria];

  return (
    <Pressable
      testID={`chip-categoria-${categoria}`}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      accessibilityState={{ selected: seleccionada }}
    >
      <Animated.View
        style={[
          estilos.chip,
          {
            backgroundColor: t.interpolate({ inputRange: [0, 1], outputRange: ['rgba(0,0,0,0)', cs.primary] }),
            borderColor: t.interpolate({ inputRange: [0, 1], outputRange: [cs.outlineVariant, cs.primary] }),
          },
        ]}
      >
        <Icon name={ICONOS[categoria]} size={16} color={contenido} />
        <Text style={{ marginLeft: 6, fontSize: AppText.detail, fontWeight: '600', color: contenido }}>{etiqueta}</Text>
      </Animated.View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: AppRadii.pill,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
});
