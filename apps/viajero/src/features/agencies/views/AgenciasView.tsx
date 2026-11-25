import { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { useDependencies } from '@/composition';
import { LABEL_AGENCY_SORT, AgencySort, valuesOf } from '@/core';
import { Grilla } from '@/features/catalog/components/Grilla';
import { BarraSuperior } from '@/features/shell/components/BarraSuperior';
import { EmptyState, FilledButton, SegmentedButton, Skeleton, TituloPagina } from '@/ui/components';
import { AppInsets, AppRadii, AppTheme, useTheme } from '@/ui/theme';

import { AgenciaCard } from '../components/AgenciaCard';
import { useAgenciasViewModel } from '../view-models/useAgenciasViewModel';

const SEGMENTOS = valuesOf(AgencySort).map((o) => ({ value: o, label: LABEL_AGENCY_SORT[o] }));

/**
 * Pestaña «Agencias» (`agencias_view.dart`): agencias verificadas con puntaje, logo y portada,
 * ordenables por puntaje, número de planes o nombre. Cada una abre `/agencia/:id`. Se puede
 * tirar para recargar aunque la lista esté vacía.
 */
export function AgenciasView() {
  const tema = useTheme();
  const { catalogo } = useDependencies();
  const vm = useAgenciasViewModel({ catalogo });
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

  return (
    <View testID="pantalla-AgenciasView" style={[estilos.flex, { backgroundColor: tema.pageBackground }]}>
      <BarraSuperior titulo={<TituloPagina texto="Agencias" />} />
      <ScrollView
        testID="agencias-scroll"
        style={estilos.flex}
        contentContainerStyle={estilos.crecer}
        alwaysBounceVertical
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={refrescar} colors={[tema.colorScheme.primary]} tintColor={tema.colorScheme.primary} />}
      >
        {vm.hayAgencias || vm.cargando ? (
          <View style={estilos.orden}>
            <SegmentedButton segments={SEGMENTOS} selected={vm.orden} onChange={vm.cambiarOrden} showSelectedIcon={false} />
          </View>
        ) : null}
        {vm.cargando && !vm.hayAgencias ? (
          <View style={AppInsets.list}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={AppInsets.betweenCards}>
                <Skeleton height={210} radius={AppRadii.card} />
              </View>
            ))}
          </View>
        ) : vm.error !== null && !vm.hayAgencias ? (
          <EmptyState
            icono="cloud_off_rounded"
            titulo="Sin conexión"
            mensaje={vm.error}
            detalle={vm.errorDetalle}
            accion={<FilledButton variant="tonal" icon="refresh_rounded" text="Reintentar" onPress={() => void vm.cargar()} />}
          />
        ) : !vm.hayAgencias ? (
          <EmptyState
            icono="storefront_outlined"
            titulo="Aún no hay agencias"
            mensaje="Cuando una agencia verificada publique planes, la verás aquí."
          />
        ) : (
          <View testID="lista-agencias" style={AppInsets.list}>
            {esGrid ? (
              <Grilla
                items={vm.agencias}
                anchoUtil={width - 40}
                clave={(a) => a.id}
                render={(a) => <AgenciaCard agencia={a} />}
              />
            ) : (
              vm.agencias.map((a) => (
                <View key={a.id} style={AppInsets.betweenCards}>
                  <AgenciaCard agencia={a} />
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const estilos = StyleSheet.create({
  flex: { flex: 1 },
  crecer: { flexGrow: 1 },
  orden: { paddingLeft: 20, paddingTop: 4, paddingRight: 20, paddingBottom: 12 },
});
