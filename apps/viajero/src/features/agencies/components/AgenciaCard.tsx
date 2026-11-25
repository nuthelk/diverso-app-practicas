import { Image } from 'expo-image';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { AgencySummary } from '@/core';
import { AppRoutes } from '@/router';
import { AgencyAvatar, Card, agencyColor, Icon, NewBadge, Text, VerifiedBadge } from '@/ui/components';
import { AppText, withAlpha, useTheme } from '@/ui/theme';

/**
 * Tarjeta de agencia de la lista (`agencia_card.dart`): portada, logo (o iniciales), nombre,
 * puntaje («Nueva» sin reseñas), ciudad, número de planes y sello. Abre `/agencia/:id`.
 */
export function AgenciaCard({ agencia }: { agencia: AgencySummary }) {
  const cs = useTheme().colorScheme;
  const router = useRouter();
  return (
    <Card
      testID={`agencia-card-${agencia.id}`}
      color={cs.surfaceContainerLow}
      accessibilityLabel={agencia.name}
      onPress={() => router.push(AppRoutes.agencia(agencia.id) as Href)}
      // En la grilla llena la celda (como en SliverGrid); en la lista no cambia nada.
      style={{ flexGrow: 1 }}
    >
      <View style={{ height: 128 }}>
        <PortadaAgencia agencia={agencia} />
        <View style={estilos.sello}>
          <VerifiedBadge onPhoto compact />
        </View>
      </View>
      <View style={estilos.pie}>
        <AgencyAvatar agency={agencia} />
        <View style={{ width: 12 }} />
        <View style={estilos.flex}>
          <Text numberOfLines={1} ellipsizeMode="tail" style={{ fontSize: AppText.largeEmphasis, fontWeight: '700', letterSpacing: -0.3 }}>
            {agencia.name}
          </Text>
          <View style={{ height: 5 }} />
          <DatosAgencia agencia={agencia} />
        </View>
      </View>
    </Card>
  );
}

/** Puntaje (★ 4.5 (2) o «Nueva»), ciudad y «N planes» en una línea que se parte si no cabe. */
export function DatosAgencia({ agencia }: { agencia: AgencySummary }) {
  const tema = useTheme();
  const cs = tema.colorScheme;
  const suave = { fontSize: AppText.largeCaption, color: cs.onSurfaceVariant };
  return (
    <View style={estilos.datos}>
      {agencia.isNew ? (
        <NewBadge text={agencia.ratingText} />
      ) : (
        <View style={estilos.fila}>
          <Icon name="star_rounded" size={17} color={tema.diverso.gold} />
          <Text style={{ marginLeft: 2, fontSize: AppText.detail, fontWeight: '700', color: cs.onSurface }}>{agencia.ratingText}</Text>
          <Text style={[suave, { marginLeft: 3 }]}>{`(${agencia.reviewsTotal})`}</Text>
        </View>
      )}
      {agencia.city !== '' ? (
        <View style={estilos.fila}>
          <Icon name="location_on_outlined" size={14} color={cs.onSurfaceVariant} />
          <Text style={[suave, { marginLeft: 2 }]}>{agencia.city}</Text>
        </View>
      ) : null}
      <Text style={suave}>{agencia.plansText}</Text>
    </View>
  );
}

/** Portada: la foto del plan mejor puntuado; sin foto (o si falla), el color de la agencia. */
export function PortadaAgencia({ agencia }: { agencia: AgencySummary }) {
  const [fallo, setFallo] = useState(false);
  const color = agencyColor(agencia.id);
  const url = agencia.coverUrl;
  if (!url || fallo) {
    return (
      <View testID="portada-agencia-respaldo" style={[StyleSheet.absoluteFill, estilos.centro, { backgroundColor: withAlpha(color, 0.16) }]}>
        <Icon name="storefront_rounded" size={40} color={withAlpha(color, 0.55)} />
      </View>
    );
  }
  return (
    <Image
      testID="portada-agencia-foto"
      source={{ uri: url }}
      contentFit="cover"
      style={StyleSheet.absoluteFill}
      onError={() => setFallo(true)}
      accessible={false}
    />
  );
}

const estilos = StyleSheet.create({
  flex: { flex: 1 },
  centro: { alignItems: 'center', justifyContent: 'center' },
  fila: { flexDirection: 'row', alignItems: 'center' },
  sello: { position: 'absolute', top: 10, left: 10 },
  pie: { flexDirection: 'row', alignItems: 'center', paddingLeft: 14, paddingTop: 12, paddingRight: 14, paddingBottom: 14 },
  datos: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 10, rowGap: 3 },
});
