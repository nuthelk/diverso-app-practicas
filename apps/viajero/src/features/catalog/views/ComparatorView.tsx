import { useRouter, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useDependencies } from '@/composition';
import { TopBar } from '@/features/shell/components/TopBar';
import { AppRoutes, safeGoBack } from '@/router';
import { CircularProgressIndicator, EmptyState, FilledButton, TextButton } from '@/ui/components';
import { useTheme } from '@/ui/theme';

import { PlanComparator } from '../components/PlanComparator';
import { plansToCompare } from '../plans-to-compare';
import { useComparatorViewModel } from '../view-models/useComparatorViewModel';

export interface ComparatorViewProps {
  /** Ids de `?ids=a,b,c` ya limpios (sin vacíos ni repetidos, máx. 3: `idsToCompare`). */
  ids: string[];
}

/**
 * `/comparar?ids=a,b,c` (`comparator_loader.dart` + `comparator_view.dart`): carga los planes por
 * id, así la pantalla se reconstruye igual tras recargar en web. Los planes que dejó el catálogo
 * en memoria (el `extra`) solo evitan la espera si son exactamente los de la URL, en orden.
 */
export function ComparatorView({ ids }: ComparatorViewProps) {
  const theme = useTheme();
  const router = useRouter();
  const { catalogo: catalog } = useDependencies();
  // Los ids y el `extra` se fijan al montar (como el `initState` de Flutter).
  const [initial] = useState(() => ({ ids, plans: plansToCompare() }));
  const vm = useComparatorViewModel({ catalog, ids: initial.ids, initialPlans: initial.plans });
  const { load } = vm;

  useEffect(() => {
    void load();
  }, [load]);

  let body;
  if (vm.plans !== null) {
    body = <PlanComparator plans={vm.plans} />;
  } else if (vm.error === null) {
    body = (
      <View style={styles.center}>
        <CircularProgressIndicator />
      </View>
    );
  } else {
    body = (
      <EmptyState
        icon="cloud_off_rounded"
        title="No pudimos cargar la comparación"
        message={vm.error}
        action={
          <View style={styles.actions}>
            <FilledButton variant="tonal" text="Reintentar" onPress={() => void vm.load()} />
            <TextButton text="Ir al catálogo" onPress={() => router.replace(AppRoutes.explore as Href)} />
          </View>
        }
      />
    );
  }

  return (
    <View testID="pantalla-ComparatorView" style={[styles.flex, { backgroundColor: theme.pageBackground }]}>
      <TopBar title="Comparar planes" onBack={() => safeGoBack(router, AppRoutes.explore)} />
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  actions: { alignItems: 'center' },
});
