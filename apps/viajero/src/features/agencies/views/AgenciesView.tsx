import { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { useDependencies } from '@/composition';
import { LABEL_AGENCY_SORT, AgencySort, valuesOf } from '@/core';
import { Grid } from '@/features/catalog/components/Grid';
import { TopBar } from '@/features/shell/components/TopBar';
import { EmptyState, FilledButton, SegmentedButton, Skeleton, PageTitle } from '@/ui/components';
import { AppInsets, AppRadii, AppTheme, useTheme } from '@/ui/theme';

import { AgencyCard } from '../components/AgencyCard';
import { useAgenciesViewModel } from '../view-models/useAgenciesViewModel';

const SORT_SEGMENTS = valuesOf(AgencySort).map((o) => ({ value: o, label: LABEL_AGENCY_SORT[o] }));

/**
 * Pestaña «Agencias» (`agencias_view.dart`): agencias verificadas con puntaje, logo y portada,
 * ordenables por puntaje, número de planes o nombre. Cada una abre `/agencia/:id`. Se puede
 * tirar para recargar aunque la lista esté vacía.
 */
export function AgenciesView() {
  const theme = useTheme();
  const { catalogo: catalog } = useDependencies();
  const vm = useAgenciesViewModel({ catalog });
  const { width } = useWindowDimensions();
  const isGrid = width > AppTheme.bpCompact;
  const [refreshing, setRefreshing] = useState(false);
  const { load } = vm;

  useEffect(() => {
    void load();
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await vm.load();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <View testID="pantalla-AgenciasView" style={[styles.flex, { backgroundColor: theme.pageBackground }]}>
      <TopBar title={<PageTitle text="Agencias" />} />
      <ScrollView
        testID="agencias-scroll"
        style={styles.flex}
        contentContainerStyle={styles.grow}
        alwaysBounceVertical
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[theme.colorScheme.primary]} tintColor={theme.colorScheme.primary} />}
      >
        {vm.hasAgencies || vm.loading ? (
          <View style={styles.sortBar}>
            <SegmentedButton segments={SORT_SEGMENTS} selected={vm.sort} onChange={vm.setSort} showSelectedIcon={false} />
          </View>
        ) : null}
        {vm.loading && !vm.hasAgencies ? (
          <View style={AppInsets.list}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={AppInsets.betweenCards}>
                <Skeleton height={210} radius={AppRadii.card} />
              </View>
            ))}
          </View>
        ) : vm.error !== null && !vm.hasAgencies ? (
          <EmptyState
            icon="cloud_off_rounded"
            title="Sin conexión"
            message={vm.error}
            details={vm.errorDetails}
            action={<FilledButton variant="tonal" icon="refresh_rounded" text="Reintentar" onPress={() => void vm.load()} />}
          />
        ) : !vm.hasAgencies ? (
          <EmptyState
            icon="storefront_outlined"
            title="Aún no hay agencias"
            message="Cuando una agencia verificada publique planes, la verás aquí."
          />
        ) : (
          <View testID="lista-agencias" style={AppInsets.list}>
            {isGrid ? (
              <Grid
                items={vm.agencies}
                usableWidth={width - 40}
                keyOf={(a) => a.id}
                render={(a) => <AgencyCard agency={a} />}
              />
            ) : (
              vm.agencies.map((a) => (
                <View key={a.id} style={AppInsets.betweenCards}>
                  <AgencyCard agency={a} />
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  grow: { flexGrow: 1 },
  sortBar: { paddingLeft: 20, paddingTop: 4, paddingRight: 20, paddingBottom: 12 },
});
