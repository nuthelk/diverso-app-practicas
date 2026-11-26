import { useRouter, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AgencySummary, formatDateInText, type Agency } from '@/core';
import { AppRoutes } from '@/router';
import { AgencyAvatar, Icon, Text, VerifiedBadge } from '@/ui/components';
import { AppInsets, AppRadii, AppText, withAlpha, useTheme } from '@/ui/theme';

/**
 * Agencia del plan (`tarjeta_agencia.dart`, confianza): mismo avatar que la lista de agencias,
 * nombre, RNT y su vigencia, sello DEBAJO del texto (en celulares angostos a su lado le robaba el
 * ancho al nombre). Abre la página de la agencia.
 */
export function PlanAgencyCard({ agency }: { agency: Agency }) {
  const theme = useTheme();
  const cs = theme.colorScheme;
  const router = useRouter();
  const summary = new AgencySummary({ id: agency.id, name: agency.name, city: agency.city, logoUrl: agency.logoUrl });
  return (
    <Pressable
      testID="plan-agency-card"
      accessibilityRole="button"
      accessibilityLabel={agency.name}
      onPress={() => router.push(AppRoutes.agency(agency.id) as Href)}
      style={({ pressed }) => [
        styles.box,
        AppInsets.card,
        { backgroundColor: cs.surfaceContainerLow },
        pressed ? { backgroundColor: withAlpha(cs.onSurface, 0.1) } : null,
      ]}
    >
      <AgencyAvatar agency={summary} size={44} />
      <View style={{ width: 12 }} />
      <View testID="plan-agency-card-texts" style={styles.flex}>
        <Text style={{ fontWeight: '700', fontSize: AppText.emphasis }}>{agency.name}</Text>
        <View style={{ height: 2 }} />
        <Text style={{ fontSize: AppText.largeCaption, color: cs.onSurfaceVariant }}>{`Agencia local · RNT ${agency.rntNumber}`}</Text>
        {agency.rntValidUntil !== null ? (
          <Text style={{ fontSize: AppText.caption, color: cs.onSurfaceVariant }}>
            {`RNT vigente hasta el ${formatDateInText(agency.rntValidUntil)}`}
          </Text>
        ) : null}
        {agency.isVerified ? (
          <View testID="agency-seal" style={styles.seal}>
            <VerifiedBadge />
          </View>
        ) : null}
      </View>
      <Icon name="chevron_right_rounded" color={cs.onSurfaceVariant} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center', borderRadius: AppRadii.card, overflow: 'hidden' },
  flex: { flex: 1 },
  // FittedBox(scaleDown): con letra grande se achica en vez de desbordar.
  seal: { marginTop: 6, alignSelf: 'flex-start', maxWidth: '100%' },
});
