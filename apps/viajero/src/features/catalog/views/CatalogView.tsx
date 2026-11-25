import { useRouter, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { useDependencies } from '@/composition';
import { formatCOP, formatShortDate, valuesOf, ExperienceCategory } from '@/core';
import { BarraSuperior } from '@/features/shell/components/BarraSuperior';
import { AppRoutes } from '@/router';
import { EmptyState, FilledButton, IconButton, InputChip, TextField, PageTitle } from '@/ui/components';
import { AppInsets, AppTheme, useTheme } from '@/ui/theme';

import { BandejaAnimada } from '../components/BandejaComparar';
import { BotonFiltros } from '../components/BotonFiltros';
import { ChipCategoria } from '../components/ChipCategoria';
import { Grilla } from '../components/Grilla';
import { PlanCard } from '../components/PlanCard';
import { ResultadosSkeleton } from '../components/ResultadosSkeleton';
import { dejarPlanesParaComparar } from '../planes-para-comparar';
import { MAX_COMPARAR, useCatalogViewModel } from '../view-models/useCatalogViewModel';

/** Padding horizontal de la lista (20 + 20): el ancho útil de la rejilla sale de la ventana. */
const LADOS_LISTA = 40;

/**
 * Catálogo, pestaña «Explorar» (`catalog_view.dart`): buscador (solo busca al enviar o al
 * borrar), filtros, categorías, resultados en lista (< 640) o rejilla y bandeja de comparación
 * debajo de la lista. El estado vive en `useCatalogViewModel` (MVVM).
 */
export function CatalogView() {
  const tema = useTheme();
  const router = useRouter();
  const { catalogo } = useDependencies();
  const vm = useCatalogViewModel({ catalogo });
  const { width } = useWindowDimensions();
  const esGrid = width > AppTheme.bpCompact;
  const [refrescando, setRefrescando] = useState(false);
  const { cargar } = vm;

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const refrescar = async () => {
    setRefrescando(true);
    try {
      await vm.cargar();
    } finally {
      setRefrescando(false);
    }
  };

  const tarjeta = (plan: (typeof vm.planes)[number]) => (
    <PlanCard plan={plan} comparada={vm.comparando(plan)} onToggleComparar={vm.toggleComparar} />
  );

  return (
    <View testID="pantalla-CatalogView" style={[estilos.flex, { backgroundColor: tema.pageBackground }]}>
      {/* El título va en la barra, fuera del scroll: las tarjetas no pasan bajo la barra de estado. */}
      <BarraSuperior titulo={<PageTitle text="Descubre Antioquia" />} />
      <ScrollView
        testID="catalogo-scroll"
        style={estilos.flex}
        contentContainerStyle={estilos.crecer}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={refrescar} colors={[tema.colorScheme.primary]} tintColor={tema.colorScheme.primary} />}
      >
        <View style={estilos.cabecera}>
          <View style={estilos.fila}>
            <TextField
              style={estilos.flex}
              value={vm.texto}
              onChangeText={vm.setTexto}
              onSubmitEditing={() => void vm.buscar()}
              returnKeyType="search"
              hint="Guatapé, café, parapente…"
              accessibilityLabel="Buscar planes"
              icon="search_rounded"
              testID="buscador"
              suffix={
                vm.texto === '' ? undefined : (
                  <IconButton
                    icon="close_rounded"
                    iconSize={19}
                    tooltip="Borrar búsqueda"
                    onPress={() => {
                      vm.setTexto('');
                      void vm.buscar();
                    }}
                  />
                )
              }
            />
            <View style={{ width: 10 }} />
            <BotonFiltros vm={vm} />
          </View>
          <View style={{ height: 12 }} />
          {vm.filtrosActivos > 0 ? (
            <>
              <View style={estilos.chips}>
                {vm.destino !== null ? (
                  <InputChip icon="location_on_outlined" iconSize={15} label={vm.destino} onDelete={() => void vm.setDestino(null)} />
                ) : null}
                {vm.fecha !== null ? (
                  <InputChip icon="event_outlined" iconSize={15} label={formatShortDate(vm.fecha)} onDelete={() => void vm.setFecha(null)} />
                ) : null}
                {vm.precioMax !== null ? (
                  <InputChip
                    icon="payments_outlined"
                    iconSize={15}
                    label={`Hasta ${formatCOP(vm.precioMax)}`}
                    onDelete={() => void vm.setPrecioMax(null)}
                  />
                ) : null}
              </View>
              <View style={{ height: 12 }} />
            </>
          ) : null}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ height: 40 }} contentContainerStyle={estilos.categorias}>
            {valuesOf(ExperienceCategory).map((c) => (
              <ChipCategoria key={c} categoria={c} seleccionada={vm.categoria === c} onPress={() => void vm.toggleCategoria(c)} />
            ))}
          </ScrollView>
          <View style={{ height: 6 }} />
        </View>

        {vm.cargando ? (
          <ResultadosSkeleton esGrid={esGrid} anchoUtil={width - LADOS_LISTA} />
        ) : vm.error !== null ? (
          <EmptyState
            icon="cloud_off_rounded"
            title="Sin conexión"
            message={vm.error}
            details={vm.errorDetalle}
            action={<FilledButton variant="tonal" icon="refresh_rounded" text="Reintentar" onPress={() => void vm.cargar()} />}
          />
        ) : vm.planes.length === 0 ? (
          <EmptyState icon="search_off_rounded" title="Sin resultados" message="Prueba con otro destino o quita algunos filtros." />
        ) : (
          <View testID="resultados" style={AppInsets.roomyList}>
            {esGrid ? (
              <Grilla items={vm.planes} anchoUtil={width - LADOS_LISTA} clave={(p) => p.id} render={tarjeta} />
            ) : (
              vm.planes.map((p) => (
                <View key={p.id} style={AppInsets.betweenCards}>
                  {tarjeta(p)}
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
      {/* La bandeja va debajo de la lista, no encima: el último plan nunca queda tapado. */}
      <BandejaAnimada
        seleccion={vm.seleccion}
        maximo={MAX_COMPARAR}
        onQuitar={vm.toggleComparar}
        onLimpiar={vm.limpiarComparar}
        onComparar={() => {
          dejarPlanesParaComparar(vm.seleccion);
          router.push(AppRoutes.compararPlanes(vm.seleccion.map((p) => p.id)) as Href);
        }}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  flex: { flex: 1 },
  crecer: { flexGrow: 1 },
  cabecera: { paddingLeft: 20, paddingTop: 4, paddingRight: 20 },
  fila: { flexDirection: 'row', alignItems: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categorias: { gap: 8, alignItems: 'center', paddingRight: 8 },
});
