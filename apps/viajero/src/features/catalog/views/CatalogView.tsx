import { useRouter, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { useDependencies } from '@/composition';
import { formatCOP, formatShortDate, valuesOf, ExperienceCategory } from '@/core';
import { TopBar } from '@/features/shell/components/TopBar';
import { AppRoutes } from '@/router';
import { EmptyState, FilledButton, IconButton, InputChip, TextField, PageTitle } from '@/ui/components';
import { AppInsets, AppTheme, useTheme } from '@/ui/theme';

import { AnimatedCompareTray } from '../components/CompareTray';
import { FiltersButton } from '../components/FiltersButton';
import { CategoryChip } from '../components/CategoryChip';
import { Grid } from '../components/Grid';
import { PlanCard } from '../components/PlanCard';
import { ResultsSkeleton } from '../components/ResultsSkeleton';
import { setPlansToCompare } from '../plans-to-compare';
import { MAX_COMPARAR, useCatalogViewModel } from '../view-models/useCatalogViewModel';

/** Padding horizontal de la lista (20 + 20): el ancho útil de la rejilla sale de la ventana. */
const LIST_SIDE_PADDING = 40;

/**
 * Catálogo, pestaña «Explorar» (`catalog_view.dart`): buscador (solo busca al enviar o al
 * borrar), filtros, categorías, resultados en lista (< 640) o rejilla y bandeja de comparación
 * debajo de la lista. El estado vive en `useCatalogViewModel` (MVVM).
 */
export function CatalogView() {
  const theme = useTheme();
  const router = useRouter();
  const { catalogo: catalog } = useDependencies();
  const vm = useCatalogViewModel({ catalog });
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

  const renderCard = (plan: (typeof vm.plans)[number]) => (
    <PlanCard plan={plan} isCompared={vm.isComparing(plan)} onToggleCompare={vm.toggleCompare} />
  );

  return (
    <View testID="pantalla-CatalogView" style={[styles.flex, { backgroundColor: theme.pageBackground }]}>
      {/* El título va en la barra, fuera del scroll: las tarjetas no pasan bajo la barra de estado. */}
      <TopBar title={<PageTitle text="Descubre Antioquia" />} />
      <ScrollView
        testID="catalogo-scroll"
        style={styles.flex}
        contentContainerStyle={styles.grow}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[theme.colorScheme.primary]} tintColor={theme.colorScheme.primary} />}
      >
        <View style={styles.header}>
          <View style={styles.row}>
            <TextField
              style={styles.flex}
              value={vm.text}
              onChangeText={vm.setText}
              onSubmitEditing={() => void vm.search()}
              returnKeyType="search"
              hint="Guatapé, café, parapente…"
              accessibilityLabel="Buscar planes"
              icon="search_rounded"
              testID="buscador"
              suffix={
                vm.text === '' ? undefined : (
                  <IconButton
                    icon="close_rounded"
                    iconSize={19}
                    tooltip="Borrar búsqueda"
                    onPress={() => {
                      vm.setText('');
                      void vm.search();
                    }}
                  />
                )
              }
            />
            <View style={{ width: 10 }} />
            <FiltersButton vm={vm} />
          </View>
          <View style={{ height: 12 }} />
          {vm.activeFilterCount > 0 ? (
            <>
              <View style={styles.chips}>
                {vm.destination !== null ? (
                  <InputChip icon="location_on_outlined" iconSize={15} label={vm.destination} onDelete={() => void vm.setDestination(null)} />
                ) : null}
                {vm.date !== null ? (
                  <InputChip icon="event_outlined" iconSize={15} label={formatShortDate(vm.date)} onDelete={() => void vm.setDate(null)} />
                ) : null}
                {vm.maxPrice !== null ? (
                  <InputChip
                    icon="payments_outlined"
                    iconSize={15}
                    label={`Hasta ${formatCOP(vm.maxPrice)}`}
                    onDelete={() => void vm.setMaxPrice(null)}
                  />
                ) : null}
              </View>
              <View style={{ height: 12 }} />
            </>
          ) : null}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ height: 40 }} contentContainerStyle={styles.categories}>
            {valuesOf(ExperienceCategory).map((c) => (
              <CategoryChip key={c} category={c} selected={vm.category === c} onPress={() => void vm.toggleCategory(c)} />
            ))}
          </ScrollView>
          <View style={{ height: 6 }} />
        </View>

        {vm.loading ? (
          <ResultsSkeleton isGrid={isGrid} usableWidth={width - LIST_SIDE_PADDING} />
        ) : vm.error !== null ? (
          <EmptyState
            icon="cloud_off_rounded"
            title="Sin conexión"
            message={vm.error}
            details={vm.errorDetails}
            action={<FilledButton variant="tonal" icon="refresh_rounded" text="Reintentar" onPress={() => void vm.load()} />}
          />
        ) : vm.plans.length === 0 ? (
          <EmptyState icon="search_off_rounded" title="Sin resultados" message="Prueba con otro destino o quita algunos filtros." />
        ) : (
          <View testID="resultados" style={AppInsets.roomyList}>
            {isGrid ? (
              <Grid items={vm.plans} usableWidth={width - LIST_SIDE_PADDING} keyOf={(p) => p.id} render={renderCard} />
            ) : (
              vm.plans.map((p) => (
                <View key={p.id} style={AppInsets.betweenCards}>
                  {renderCard(p)}
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
      {/* La bandeja va debajo de la lista, no encima: el último plan nunca queda tapado. */}
      <AnimatedCompareTray
        selection={vm.selection}
        max={MAX_COMPARAR}
        onRemove={vm.toggleCompare}
        onClear={vm.clearCompare}
        onCompare={() => {
          setPlansToCompare(vm.selection);
          router.push(AppRoutes.compararPlanes(vm.selection.map((p) => p.id)) as Href);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  grow: { flexGrow: 1 },
  header: { paddingLeft: 20, paddingTop: 4, paddingRight: 20 },
  row: { flexDirection: 'row', alignItems: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categories: { gap: 8, alignItems: 'center', paddingRight: 8 },
});
