import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { EMOJI_EXPERIENCE_CATEGORY, formatLongDate, type Plan, type PlanDate } from '@/core';
import { Text } from '@/ui/components';
import { AppInsets, AppRadii, AppText, useTheme } from '@/ui/theme';

const LADO = 64;

/** Cabecera del checkout: foto (o emoji), título, fecha larga, destino y punto de encuentro. */
export function ResumenPlan({ plan, fecha }: { plan: Plan; fecha: PlanDate }) {
  const cs = useTheme().colorScheme;
  const foto = plan.mainPhoto;
  return (
    <View style={[estilos.caja, AppInsets.wideCard, { backgroundColor: cs.surfaceContainerLow }]}>
      <View style={[estilos.miniatura, { backgroundColor: cs.primaryContainer }]}>
        {foto === null ? (
          <Text style={{ fontSize: AppText.headingXl }}>{EMOJI_EXPERIENCE_CATEGORY[plan.category]}</Text>
        ) : (
          <Image source={{ uri: foto }} contentFit="cover" style={StyleSheet.absoluteFill} accessible={false} />
        )}
      </View>
      <View style={{ width: 14 }} />
      <View style={estilos.textos}>
        <Text numberOfLines={2} altura={1.25} style={{ fontWeight: '700', fontSize: AppText.emphasis }}>
          {plan.title}
        </Text>
        <View style={{ height: 5 }} />
        <Text style={{ fontSize: AppText.largeCaption, color: cs.onSurfaceVariant }}>
          {`${formatLongDate(fecha.date)} · ${plan.destination}`}
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

const estilos = StyleSheet.create({
  caja: { flexDirection: 'row', alignItems: 'center', borderRadius: AppRadii.card },
  miniatura: {
    width: LADO,
    height: LADO,
    borderRadius: AppRadii.field,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textos: { flex: 1, minWidth: 0 },
});
