import { useRouter } from 'expo-router';
import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useDependencies } from '@/composition';
import { TopBar } from '@/features/shell/components/TopBar';
import { AppRoutes, safeGoBack } from '@/router';
import { CircularProgressIndicator, EmptyState, FilledButton } from '@/ui/components';
import { useTheme } from '@/ui/theme';

import { goTo } from '../go-to';
import { useCheckoutPlanViewModel } from '../view-models/useCheckoutPlanViewModel';
import { CheckoutWithPlanView } from './CheckoutWithPlanView';

export interface CheckoutViewProps {
  planId: string;
  dateId: string;
}

/**
 * `/checkout/:planId/:fechaId` (`CheckoutLoader`): carga el plan y la fecha por id desde el
 * backend, así la pantalla se reconstruye igual tras recargar la página en web (sin `extra`).
 * Con el plan y una fecha reservable pinta `CheckoutWithPlanView`.
 */
export function CheckoutView({ planId, dateId }: CheckoutViewProps) {
  const { catalog } = useDependencies();
  const router = useRouter();
  const vm = useCheckoutPlanViewModel({ catalog }, { planId, dateId });

  useEffect(() => {
    void vm.load();
    // Solo al montar (`initState`): los ids no cambian en esta pantalla.
  }, []);

  if (vm.loading) {
    return (
      <CheckoutFrame backTo={AppRoutes.plan(planId)}>
        <View style={styles.center}>
          <CircularProgressIndicator />
        </View>
      </CheckoutFrame>
    );
  }
  const plan = vm.plan;
  if (vm.error !== null || plan === null) {
    return (
      <CheckoutFrame backTo={AppRoutes.plan(planId)}>
        <EmptyState
          icon="cloud_off_rounded"
          title="No pudimos cargar el plan"
          message="Revisa tu conexión e intenta de nuevo."
          action={<FilledButton variant="tonal" text="Reintentar" onPress={() => void vm.load()} />}
        />
      </CheckoutFrame>
    );
  }
  const planDate = vm.planDate;
  if (planDate === null) {
    return (
      <CheckoutFrame backTo={AppRoutes.plan(planId)}>
        <EmptyState
          icon="event_busy_rounded"
          title="Fecha no disponible"
          message="Esa fecha ya no está disponible. Elige otra salida de este plan."
          action={
            <FilledButton variant="tonal" text="Ver fechas del plan" onPress={() => goTo(router, AppRoutes.plan(plan.id))} />
          }
        />
      </CheckoutFrame>
    );
  }
  return <CheckoutWithPlanView plan={plan} planDate={planDate} />;
}

/** `Scaffold(AppBar('Confirmar y pagar'))` de los estados de carga. */
function CheckoutFrame({ children, backTo }: { children: ReactNode; backTo: string }) {
  const theme = useTheme();
  const router = useRouter();
  return (
    <View testID="screen-CheckoutView" style={[styles.screen, { backgroundColor: theme.pageBackground }]}>
      <TopBar title="Confirmar y pagar" onBack={() => safeGoBack(router, backTo)} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
