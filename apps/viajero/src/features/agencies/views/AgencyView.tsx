import { useRouter } from 'expo-router';
import { useEffect, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { useDependencies } from '@/composition';
import { TopBar } from '@/features/shell/components/TopBar';
import { AppRoutes, volverSeguro } from '@/router';
import { EmptyState, FilledButton, Skeleton } from '@/ui/components';
import { AppInsets, AppRadii, useTheme } from '@/ui/theme';

import { AgencyContent } from '../components/AgencyContent';
import { useAgencyViewModel } from '../view-models/useAgencyViewModel';

export interface AgencyViewProps {
  agencyId: string;
}

/**
 * Página de una agencia (`/agencia/:id`, `agencia_view.dart`): portada, logo o iniciales,
 * nombre, puntaje, ciudad, descripción y sus planes publicados. Carga todo por id: sobrevive a
 * una recarga en web. «Volver» sin historial lleva a la lista de agencias.
 */
export function AgencyView({ agencyId }: AgencyViewProps) {
  const theme = useTheme();
  const router = useRouter();
  const { catalogo: catalog } = useDependencies();
  const vm = useAgencyViewModel({ catalog, agencyId });
  const { load } = vm;
  const goBack = () => volverSeguro(router, AppRoutes.agencias);

  useEffect(() => {
    void load();
  }, [load]);

  let body: ReactNode;
  if (vm.loading && vm.agency === null) {
    body = (
      <AgencyNotice onBack={goBack}>
        <ScrollView contentContainerStyle={AppInsets.content}>
          <Skeleton height={160} radius={AppRadii.card} />
          <View style={{ height: 16 }} />
          <Skeleton width={220} height={22} />
          <View style={{ height: 10 }} />
          <Skeleton width={140} height={14} />
          <View style={{ height: 24 }} />
          <Skeleton height={210} radius={AppRadii.card} />
        </ScrollView>
      </AgencyNotice>
    );
  } else if (vm.error !== null && vm.agency === null) {
    body = (
      <AgencyNotice onBack={goBack}>
        <EmptyState
          icon="cloud_off_rounded"
          title="No pudimos cargar la agencia"
          message={vm.error}
          details={vm.errorDetails}
          action={<FilledButton variant="tonal" icon="refresh_rounded" text="Reintentar" onPress={() => void vm.load()} />}
        />
      </AgencyNotice>
    );
  } else if (vm.agency === null) {
    body = (
      <AgencyNotice onBack={goBack}>
        <EmptyState
          icon="storefront_outlined"
          title="Agencia no disponible"
          message="Esta agencia no existe o ya no tiene planes publicados."
        />
      </AgencyNotice>
    );
  } else {
    body = <AgencyContent agency={vm.agency} plans={vm.plans} onRefresh={vm.load} onBack={goBack} />;
  }

  return (
    <View testID="pantalla-AgenciaView" style={[styles.flex, { backgroundColor: theme.pageBackground }]}>
      {body}
    </View>
  );
}

/** Pantalla sin portada (cargando, error, no encontrada): solo la barra con «Volver». */
function AgencyNotice({ onBack, children }: { onBack: () => void; children: ReactNode }) {
  return (
    <View style={styles.flex}>
      <TopBar title="" onBack={onBack} />
      <View style={styles.flex}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
