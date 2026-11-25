import { useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { buildComparisonRows, type Plan } from '@/core';
import { EmptyState, IconButton, Text } from '@/ui/components';
import { AppText, useTheme } from '@/ui/theme';

import { TablaComparacion } from './TablaComparacion';

const MIN_VIAJEROS = 1;
const MAX_VIAJEROS = 20;
/** Padding horizontal de la lista (20 + 20). */
const LADOS = 40;

/**
 * El comparador ya con sus planes (`comparator_view.dart`): con menos de 2 avisa que no hay qué
 * comparar; si no, título, «¿Cuántos viajan?» (1–20, 2 por defecto) y la tabla con el total
 * recalculado para esos viajeros.
 */
export function ComparadorPlanes({ planes }: { planes: readonly Plan[] }) {
  const cs = useTheme().colorScheme;
  const { width } = useWindowDimensions();
  const [pax, setPax] = useState(2);

  if (planes.length < 2) {
    return (
      <EmptyState
        icono="compare_arrows_rounded"
        titulo="Nada para comparar"
        mensaje="Selecciona dos o tres planes en el catálogo con el ícono de comparar."
      />
    );
  }
  return (
    <ScrollView testID="comparador-scroll" contentContainerStyle={estilos.lista}>
      <Text style={{ fontSize: AppText.headingXl, fontWeight: '800', letterSpacing: -0.8, color: cs.onSurface }}>
        Elige con toda la información
      </Text>
      <View style={{ height: 4 }} />
      <Text style={{ color: cs.onSurfaceVariant, fontSize: AppText.smallBody }}>Precio final por persona, sin cargos ocultos.</Text>
      <View style={{ height: 16 }} />
      <SelectorViajeros pax={pax} onCambio={setPax} min={MIN_VIAJEROS} max={MAX_VIAJEROS} />
      <View style={{ height: 20 }} />
      <TablaComparacion planes={planes} filas={buildComparisonRows(planes, { pax })} anchoDisponible={width - LADOS} />
    </ScrollView>
  );
}

/** «¿Cuántos viajan?» con − / + que recalcula el total de la tabla. */
function SelectorViajeros({ pax, onCambio, min, max }: { pax: number; onCambio: (v: number) => void; min: number; max: number }) {
  const cs = useTheme().colorScheme;
  return (
    <View style={estilos.fila}>
      <Text style={{ flex: 1, fontSize: AppText.body, fontWeight: '600', color: cs.onSurface }}>¿Cuántos viajan?</Text>
      <IconButton variante="outlined" icono="remove_rounded" tooltip="Menos viajeros" onPress={pax > min ? () => onCambio(pax - 1) : null} />
      <Text testID="viajeros" style={{ width: 40, textAlign: 'center', fontSize: AppText.largeSubtitle, fontWeight: '800' }}>
        {String(pax)}
      </Text>
      <IconButton variante="outlined" icono="add_rounded" tooltip="Más viajeros" onPress={pax < max ? () => onCambio(pax + 1) : null} />
    </View>
  );
}

const estilos = StyleSheet.create({
  lista: { paddingLeft: 20, paddingTop: 8, paddingRight: 20, paddingBottom: 32 },
  fila: { flexDirection: 'row', alignItems: 'center' },
});
