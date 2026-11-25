import { useState } from 'react';
import { RefreshControl, StyleSheet, useWindowDimensions, View } from 'react-native';

import type { AgencySummary, Plan } from '@/core';
import { Grid } from '@/features/catalog/components/Grid';
import { PlanCard } from '@/features/catalog/components/PlanCard';
import { AgencyAvatar, CollapsibleHeader, pageTitleStyle, SectionLabel, Text, VerifiedBadge } from '@/ui/components';
import { AppInsets, AppText, AppTheme, useTheme } from '@/ui/theme';

import { AgencyInfo, AgencyCover } from './AgencyCard';

/**
 * El cuerpo de la página de una agencia cargada (`contenido_agencia.dart`): cabecera colapsable
 * con la portada, logo, nombre, datos, sello, descripción y sus planes (sin botón de comparar).
 */
export function AgencyContent({
  agency,
  plans,
  onRefresh,
  onBack,
}: {
  agency: AgencySummary;
  plans: readonly Plan[];
  onRefresh: () => Promise<void>;
  onBack: () => void;
}) {
  const theme = useTheme();
  const cs = theme.colorScheme;
  const { width } = useWindowDimensions();
  const isGrid = width > AppTheme.bpCompact;
  const [refreshing, setRefreshing] = useState(false);
  const description = agency.description.trim();

  const refresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <CollapsibleHeader
      title={agency.name}
      expandedHeight={220}
      onBack={onBack}
      background={<AgencyCover agency={agency} />}
      scrollViewProps={{
        refreshControl: <RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[cs.primary]} tintColor={cs.primary} />,
        alwaysBounceVertical: true,
      }}
    >
      <View style={styles.block}>
        <View style={styles.row}>
          <AgencyAvatar agency={agency} size={64} />
          <View style={{ width: 14 }} />
          <View style={styles.flex}>
            <Text height={1.1} accessibilityRole="header" style={[pageTitleStyle(cs), { fontSize: AppText.headingXl }]}>
              {agency.name}
            </Text>
            <View style={{ height: 8 }} />
            <AgencyInfo agency={agency} />
          </View>
        </View>
        <View style={{ height: 14 }} />
        <View style={styles.start}>
          <VerifiedBadge />
        </View>
        {description !== '' ? (
          <>
            <View style={{ height: 16 }} />
            <Text height={1.5} style={{ fontSize: AppText.largeBody, color: cs.onSurfaceVariant }}>
              {description}
            </Text>
          </>
        ) : null}
        <View style={{ height: 28 }} />
        <SectionLabel text={`Planes publicados (${plans.length})`} />
      </View>
      {plans.length === 0 ? (
        <View style={styles.empty}>
          <Text>Esta agencia no tiene planes disponibles por ahora.</Text>
        </View>
      ) : (
        <View style={AppInsets.list}>
          {isGrid ? (
            <Grid
              items={plans}
              usableWidth={width - 40}
              keyOf={(p) => p.id}
              render={(p) => <PlanCard plan={p} />}
            />
          ) : (
            plans.map((p) => (
              <View key={p.id} style={AppInsets.betweenCards}>
                <PlanCard plan={p} />
              </View>
            ))
          )}
        </View>
      )}
    </CollapsibleHeader>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  start: { alignItems: 'flex-start' },
  block: { paddingLeft: 22, paddingTop: 20, paddingRight: 22, paddingBottom: 8 },
  empty: { paddingLeft: 22, paddingTop: 8, paddingRight: 22, paddingBottom: 32 },
});
