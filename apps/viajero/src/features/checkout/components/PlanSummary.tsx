import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { EMOJI_EXPERIENCE_CATEGORY, formatLongDate, type Plan, type PlanDate } from '@/core';
import { Text } from '@/ui/components';
import { AppInsets, AppRadii, AppText, useTheme } from '@/ui/theme';

const SIDE = 64;

/** Cabecera del checkout: foto (o emoji), título, fecha larga, destino y punto de encuentro. */
export function PlanSummary({ plan, planDate }: { plan: Plan; planDate: PlanDate }) {
  const cs = useTheme().colorScheme;
  const photo = plan.mainPhoto;
  return (
    <View style={[styles.box, AppInsets.wideCard, { backgroundColor: cs.surfaceContainerLow }]}>
      <View style={[styles.thumbnail, { backgroundColor: cs.primaryContainer }]}>
        {photo === null ? (
          <Text style={{ fontSize: AppText.headingXl }}>{EMOJI_EXPERIENCE_CATEGORY[plan.category]}</Text>
        ) : (
          <Image source={{ uri: photo }} contentFit="cover" style={StyleSheet.absoluteFill} accessible={false} />
        )}
      </View>
      <View style={{ width: 14 }} />
      <View style={styles.texts}>
        <Text numberOfLines={2} height={1.25} style={{ fontWeight: '700', fontSize: AppText.emphasis }}>
          {plan.title}
        </Text>
        <View style={{ height: 5 }} />
        <Text style={{ fontSize: AppText.largeCaption, color: cs.onSurfaceVariant }}>
          {`${formatLongDate(planDate.date)} · ${plan.destination}`}
        </Text>
        {plan.meetingPoint !== '' ? (
          <Text numberOfLines={1} style={{ fontSize: AppText.caption, color: cs.onSurfaceVariant }}>
            {plan.meetingPoint}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center', borderRadius: AppRadii.card },
  thumbnail: {
    width: SIDE,
    height: SIDE,
    borderRadius: AppRadii.field,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: { flex: 1, minWidth: 0 },
});
