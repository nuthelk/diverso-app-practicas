import { useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { buildComparisonRows, type Plan } from '@/core';
import { EmptyState, IconButton, Text } from '@/ui/components';
import { AppText, useTheme } from '@/ui/theme';

import { ComparisonTable } from './ComparisonTable';

const MIN_TRAVELERS = 1;
const MAX_TRAVELERS = 20;
/** Padding horizontal de la lista (20 + 20). */
const SIDE_PADDING = 40;

/**
 * El comparador ya con sus planes (`comparator_view.dart`): con menos de 2 avisa que no hay qué
 * comparar; si no, título, «¿Cuántos viajan?» (1–20, 2 por defecto) y la tabla con el total
 * recalculado para esos viajeros.
 */
export function PlanComparator({ plans }: { plans: readonly Plan[] }) {
  const cs = useTheme().colorScheme;
  const { width } = useWindowDimensions();
  const [pax, setPax] = useState(2);

  if (plans.length < 2) {
    return (
      <EmptyState
        icon="compare_arrows_rounded"
        title="Nada para comparar"
        message="Selecciona dos o tres planes en el catálogo con el ícono de comparar."
      />
    );
  }
  return (
    <ScrollView testID="comparator-scroll" contentContainerStyle={styles.list}>
      <Text style={{ fontSize: AppText.headingXl, fontWeight: '800', letterSpacing: -0.8, color: cs.onSurface }}>
        Elige con toda la información
      </Text>
      <View style={{ height: 4 }} />
      <Text style={{ color: cs.onSurfaceVariant, fontSize: AppText.smallBody }}>Precio final por persona, sin cargos ocultos.</Text>
      <View style={{ height: 16 }} />
      <TravelersPicker pax={pax} onChange={setPax} min={MIN_TRAVELERS} max={MAX_TRAVELERS} />
      <View style={{ height: 20 }} />
      <ComparisonTable plans={plans} rows={buildComparisonRows(plans, { pax })} availableWidth={width - SIDE_PADDING} />
    </ScrollView>
  );
}

/** «¿Cuántos viajan?» con − / + que recalcula el total de la tabla. */
function TravelersPicker({ pax, onChange, min, max }: { pax: number; onChange: (v: number) => void; min: number; max: number }) {
  const cs = useTheme().colorScheme;
  return (
    <View style={styles.row}>
      <Text style={{ flex: 1, fontSize: AppText.body, fontWeight: '600', color: cs.onSurface }}>¿Cuántos viajan?</Text>
      <IconButton variant="outlined" icon="remove_rounded" tooltip="Menos viajeros" onPress={pax > min ? () => onChange(pax - 1) : null} />
      <Text testID="travelers-count" style={{ width: 40, textAlign: 'center', fontSize: AppText.largeSubtitle, fontWeight: '800' }}>
        {String(pax)}
      </Text>
      <IconButton variant="outlined" icon="add_rounded" tooltip="Más viajeros" onPress={pax < max ? () => onChange(pax + 1) : null} />
    </View>
  );
}

const styles = StyleSheet.create({
  list: { paddingLeft: 20, paddingTop: 8, paddingRight: 20, paddingBottom: 32 },
  row: { flexDirection: 'row', alignItems: 'center' },
});
