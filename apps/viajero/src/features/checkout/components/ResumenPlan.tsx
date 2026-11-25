import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { EMOJI_EXPERIENCE_CATEGORY, formatFechaLarga, type Plan, type PlanDate } from '@/core';
import { Text } from '@/ui/components';
import { AppInsets, AppRadios, AppText, useTheme } from '@/ui/theme';

const LADO = 64;

/** Cabecera del checkout: foto (o emoji), título, fecha larga, destino y punto de encuentro. */
export function ResumenPlan({ plan, fecha }: { plan: Plan; fecha: PlanDate }) {
  const cs = useTheme().colorScheme;
  const foto = plan.fotoPrincipal;
  return (
    <View style={[estilos.caja, AppInsets.tarjetaAmplia, { backgroundColor: cs.surfaceContainerLow }]}>
      <View style={[estilos.miniatura, { backgroundColor: cs.primaryContainer }]}>
        {foto === null ? (
          <Text style={{ fontSize: AppText.encabezadoXl }}>{EMOJI_EXPERIENCE_CATEGORY[plan.categoria]}</Text>
        ) : (
          <Image source={{ uri: foto }} contentFit="cover" style={StyleSheet.absoluteFill} accessible={false} />
        )}
      </View>
      <View style={{ width: 14 }} />
      <View style={estilos.textos}>
        <Text numberOfLines={2} altura={1.25} style={{ fontWeight: '700', fontSize: AppText.enfasis }}>
          {plan.titulo}
        </Text>
        <View style={{ height: 5 }} />
        <Text style={{ fontSize: AppText.leyendaGrande, color: cs.onSurfaceVariant }}>
          {`${formatFechaLarga(fecha.fecha)} · ${plan.destino}`}
        </Text>
        {plan.puntoEncuentro !== '' ? (
          <Text numberOfLines={1} style={{ fontSize: AppText.leyenda, color: cs.onSurfaceVariant }}>
            {plan.puntoEncuentro}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  caja: { flexDirection: 'row', alignItems: 'center', borderRadius: AppRadios.card },
  miniatura: {
    width: LADO,
    height: LADO,
    borderRadius: AppRadios.field,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textos: { flex: 1, minWidth: 0 },
});
