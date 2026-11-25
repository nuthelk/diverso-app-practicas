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
export function AgencyCard({ agency }: { agency: AgencySummary }) {
  const cs = useTheme().colorScheme;
  const router = useRouter();
  return (
    <Card
      testID={`agencia-card-${agency.id}`}
      color={cs.surfaceContainerLow}
      accessibilityLabel={agency.name}
      onPress={() => router.push(AppRoutes.agencia(agency.id) as Href)}
      // En la grilla llena la celda (como en SliverGrid); en la lista no cambia nada.
      style={{ flexGrow: 1 }}
    >
      <View style={{ height: 128 }}>
        <AgencyCover agency={agency} />
        <View style={styles.seal}>
          <VerifiedBadge onPhoto compact />
        </View>
      </View>
      <View style={styles.footer}>
        <AgencyAvatar agency={agency} />
        <View style={{ width: 12 }} />
        <View style={styles.flex}>
          <Text numberOfLines={1} ellipsizeMode="tail" style={{ fontSize: AppText.largeEmphasis, fontWeight: '700', letterSpacing: -0.3 }}>
            {agency.name}
          </Text>
          <View style={{ height: 5 }} />
          <AgencyInfo agency={agency} />
        </View>
      </View>
    </Card>
  );
}

/** Puntaje (★ 4.5 (2) o «Nueva»), ciudad y «N planes» en una línea que se parte si no cabe. */
export function AgencyInfo({ agency }: { agency: AgencySummary }) {
  const theme = useTheme();
  const cs = theme.colorScheme;
  const mutedText = { fontSize: AppText.largeCaption, color: cs.onSurfaceVariant };
  return (
    <View style={styles.info}>
      {agency.isNew ? (
        <NewBadge text={agency.ratingText} />
      ) : (
        <View style={styles.row}>
          <Icon name="star_rounded" size={17} color={theme.diverso.gold} />
          <Text style={{ marginLeft: 2, fontSize: AppText.detail, fontWeight: '700', color: cs.onSurface }}>{agency.ratingText}</Text>
          <Text style={[mutedText, { marginLeft: 3 }]}>{`(${agency.reviewsTotal})`}</Text>
        </View>
      )}
      {agency.city !== '' ? (
        <View style={styles.row}>
          <Icon name="location_on_outlined" size={14} color={cs.onSurfaceVariant} />
          <Text style={[mutedText, { marginLeft: 2 }]}>{agency.city}</Text>
        </View>
      ) : null}
      <Text style={mutedText}>{agency.plansText}</Text>
    </View>
  );
}

/** Portada: la foto del plan mejor puntuado; sin foto (o si falla), el color de la agencia. */
export function AgencyCover({ agency }: { agency: AgencySummary }) {
  const [failed, setFailed] = useState(false);
  const color = agencyColor(agency.id);
  const url = agency.coverUrl;
  if (!url || failed) {
    return (
      <View testID="portada-agencia-respaldo" style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: withAlpha(color, 0.16) }]}>
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
      onError={() => setFailed(true)}
      accessible={false}
    />
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  seal: { position: 'absolute', top: 10, left: 10 },
  footer: { flexDirection: 'row', alignItems: 'center', paddingLeft: 14, paddingTop: 12, paddingRight: 14, paddingBottom: 14 },
  info: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 10, rowGap: 3 },
});
