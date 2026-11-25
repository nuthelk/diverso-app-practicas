import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';

import { LABEL_EXPERIENCE_CATEGORY, type ExperienceCategory } from '@/core';
import { Icon, Text, type IconName } from '@/ui/components';
import { AppRadii, AppText, Curves, Durations, useTheme } from '@/ui/theme';

const ICONS: Record<ExperienceCategory, IconName> = {
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
export function CategoryChip({
  category,
  selected,
  onPress,
}: {
  category: ExperienceCategory;
  selected: boolean;
  onPress: () => void;
}) {
  const cs = useTheme().colorScheme;
  const t = useRef(new Animated.Value(selected ? 1 : 0)).current;
  useEffect(() => {
    const animation = Animated.timing(t, {
      toValue: selected ? 1 : 0,
      duration: Durations.categoryChip,
      easing: Curves.easeOut.fn,
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [selected, t]);
  const contentColor = selected ? cs.onPrimary : cs.onSurfaceVariant;
  const label = LABEL_EXPERIENCE_CATEGORY[category];

  return (
    <Pressable
      testID={`chip-categoria-${category}`}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
    >
      <Animated.View
        style={[
          styles.chip,
          {
            backgroundColor: t.interpolate({ inputRange: [0, 1], outputRange: ['rgba(0,0,0,0)', cs.primary] }),
            borderColor: t.interpolate({ inputRange: [0, 1], outputRange: [cs.outlineVariant, cs.primary] }),
          },
        ]}
      >
        <Icon name={ICONS[category]} size={16} color={contentColor} />
        <Text style={{ marginLeft: 6, fontSize: AppText.detail, fontWeight: '600', color: contentColor }}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: AppRadii.pill,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
});
