import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { Icon, Skeleton, Text, type IconName } from '@/ui/components';
import { AppRadii, AppText, useTheme } from '@/ui/theme';

/** Píldora de «Qué incluye»; un texto libre del plan ([isLongText]) se recorta con «…». */
export function IncludesPill({ icon, text, isLongText = false }: { icon: IconName; text: string; isLongText?: boolean }) {
  const cs = useTheme().colorScheme;
  return (
    <View testID="incluye-pill" style={[styles.pill, { backgroundColor: cs.surfaceContainerLow }]}>
      <Icon name={icon} size={15} color={cs.primary} />
      <View style={{ width: 6 }} />
      <Text
        numberOfLines={isLongText ? 1 : undefined}
        ellipsizeMode="tail"
        style={{ flexShrink: 1, fontSize: AppText.largeCaption, fontWeight: '600' }}
      >
        {text}
      </Text>
    </View>
  );
}

/** Marcador de la ficha mientras carga (`detalle_skeleton.dart`). */
export function PlanDetailSkeleton() {
  // AspectRatio(1.4) a todo el ancho.
  const { width } = useWindowDimensions();
  return (
    <View testID="detalle-skeleton">
      <Skeleton height={width / 1.4} radius={0} />
      <View style={{ padding: 22 }}>
        <Skeleton width={260} height={24} />
        <View style={{ height: 14 }} />
        <Skeleton height={14} />
        <View style={{ height: 10 }} />
        <Skeleton width={180} height={14} />
        <View style={{ height: 26 }} />
        <Skeleton height={90} radius={20} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '100%',
    borderRadius: AppRadii.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});
