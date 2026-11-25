import { useRouter, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useDependencies } from '@/composition';
import { BarraSuperior } from '@/features/shell/components/BarraSuperior';
import { AppRoutes, volverSeguro } from '@/router';
import { CircularProgressIndicator, EmptyState, FilledButton, TextButton } from '@/ui/components';
import { useTheme } from '@/ui/theme';

import { ComparadorPlanes } from '../components/ComparadorPlanes';
import { planesParaComparar } from '../planes-para-comparar';
import { useComparatorViewModel } from '../view-models/useComparatorViewModel';

export interface ComparatorViewProps {
  /** Ids de `?ids=a,b,c` ya limpios (sin vacíos ni repetidos, máx. 3: `idsAComparar`). */
  ids: string[];
}

/**
 * `/comparar?ids=a,b,c` (`comparator_loader.dart` + `comparator_view.dart`): carga los planes por
 * id, así la pantalla se reconstruye igual tras recargar en web. Los planes que dejó el catálogo
 * en memoria (el `extra`) solo evitan la espera si son exactamente los de la URL, en orden.
 */
export function ComparatorView({ ids }: ComparatorViewProps) {
  const tema = useTheme();
  const router = useRouter();
  const { catalogo } = useDependencies();
  // Los ids y el `extra` se fijan al montar (como el `initState` de Flutter).
  const [inicio] = useState(() => ({ ids, planes: planesParaComparar() }));
  const vm = useComparatorViewModel({ catalogo, ids: inicio.ids, planesIniciales: inicio.planes });
  const { cargar } = vm;

  useEffect(() => {
    void cargar();
  }, [cargar]);

  let cuerpo;
  if (vm.planes !== null) {
    cuerpo = <ComparadorPlanes planes={vm.planes} />;
  } else if (vm.error === null) {
    cuerpo = (
      <View style={estilos.centro}>
        <CircularProgressIndicator />
      </View>
    );
  } else {
    cuerpo = (
      <EmptyState
        icono="cloud_off_rounded"
        titulo="No pudimos cargar la comparación"
        mensaje={vm.error}
        accion={
          <View style={estilos.acciones}>
            <FilledButton variant="tonal" text="Reintentar" onPress={() => void vm.cargar()} />
            <TextButton text="Ir al catálogo" onPress={() => router.replace(AppRoutes.explorar as Href)} />
          </View>
        }
      />
    );
  }

  return (
    <View testID="pantalla-ComparatorView" style={[estilos.flex, { backgroundColor: tema.pageBackground }]}>
      <BarraSuperior titulo="Comparar planes" onVolver={() => volverSeguro(router, AppRoutes.explorar)} />
      {cuerpo}
    </View>
  );
}

const estilos = StyleSheet.create({
  flex: { flex: 1 },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  acciones: { alignItems: 'center' },
});
