import { useRouter } from 'expo-router';
import { useEffect, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { useDependencies } from '@/composition';
import { BarraSuperior } from '@/features/shell/components/BarraSuperior';
import { AppRoutes, volverSeguro } from '@/router';
import { EmptyState, FilledButton, Skeleton } from '@/ui/components';
import { AppInsets, AppRadii, useTheme } from '@/ui/theme';

import { ContenidoAgencia } from '../components/ContenidoAgencia';
import { useAgenciaViewModel } from '../view-models/useAgenciaViewModel';

export interface AgenciaViewProps {
  agencyId: string;
}

/**
 * Página de una agencia (`/agencia/:id`, `agencia_view.dart`): portada, logo o iniciales,
 * nombre, puntaje, ciudad, descripción y sus planes publicados. Carga todo por id: sobrevive a
 * una recarga en web. «Volver» sin historial lleva a la lista de agencias.
 */
export function AgenciaView({ agencyId }: AgenciaViewProps) {
  const tema = useTheme();
  const router = useRouter();
  const { catalogo } = useDependencies();
  const vm = useAgenciaViewModel({ catalogo, agencyId });
  const { cargar } = vm;
  const volver = () => volverSeguro(router, AppRoutes.agencias);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  let cuerpo: ReactNode;
  if (vm.cargando && vm.agencia === null) {
    cuerpo = (
      <AvisoAgencia onVolver={volver}>
        <ScrollView contentContainerStyle={AppInsets.content}>
          <Skeleton height={160} radius={AppRadii.card} />
          <View style={{ height: 16 }} />
          <Skeleton width={220} height={22} />
          <View style={{ height: 10 }} />
          <Skeleton width={140} height={14} />
          <View style={{ height: 24 }} />
          <Skeleton height={210} radius={AppRadii.card} />
        </ScrollView>
      </AvisoAgencia>
    );
  } else if (vm.error !== null && vm.agencia === null) {
    cuerpo = (
      <AvisoAgencia onVolver={volver}>
        <EmptyState
          icon="cloud_off_rounded"
          title="No pudimos cargar la agencia"
          message={vm.error}
          details={vm.errorDetalle}
          action={<FilledButton variant="tonal" icon="refresh_rounded" text="Reintentar" onPress={() => void vm.cargar()} />}
        />
      </AvisoAgencia>
    );
  } else if (vm.agencia === null) {
    cuerpo = (
      <AvisoAgencia onVolver={volver}>
        <EmptyState
          icon="storefront_outlined"
          title="Agencia no disponible"
          message="Esta agencia no existe o ya no tiene planes publicados."
        />
      </AvisoAgencia>
    );
  } else {
    cuerpo = <ContenidoAgencia agencia={vm.agencia} planes={vm.planes} onRefresh={vm.cargar} onVolver={volver} />;
  }

  return (
    <View testID="pantalla-AgenciaView" style={[estilos.flex, { backgroundColor: tema.pageBackground }]}>
      {cuerpo}
    </View>
  );
}

/** Pantalla sin portada (cargando, error, no encontrada): solo la barra con «Volver». */
function AvisoAgencia({ onVolver, children }: { onVolver: () => void; children: ReactNode }) {
  return (
    <View style={estilos.flex}>
      <BarraSuperior titulo="" onVolver={onVolver} />
      <View style={estilos.flex}>{children}</View>
    </View>
  );
}

const estilos = StyleSheet.create({
  flex: { flex: 1 },
});
