import { useRouter } from 'expo-router';
import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useDependencies } from '@/composition';
import { BarraSuperior } from '@/features/shell/components/BarraSuperior';
import { AppRoutes, volverSeguro } from '@/router';
import { CircularProgressIndicator, EmptyState, FilledButton } from '@/ui/components';
import { useTheme } from '@/ui/theme';

import { irA } from '../ir-a';
import { useCheckoutPlanViewModel } from '../view-models/useCheckoutPlanViewModel';
import { CheckoutConPlanView } from './CheckoutConPlanView';

export interface CheckoutViewProps {
  planId: string;
  fechaId: string;
}

/**
 * `/checkout/:planId/:fechaId` (`CheckoutLoader`): carga el plan y la fecha por id desde el
 * backend, así la pantalla se reconstruye igual tras recargar la página en web (sin `extra`).
 * Con el plan y una fecha reservable pinta `CheckoutConPlanView`.
 */
export function CheckoutView({ planId, fechaId }: CheckoutViewProps) {
  const { catalogo } = useDependencies();
  const router = useRouter();
  const vm = useCheckoutPlanViewModel({ catalogo }, { planId, fechaId });

  useEffect(() => {
    void vm.cargar();
    // Solo al montar (`initState`): los ids no cambian en esta pantalla.
  }, []);

  if (vm.cargando) {
    return (
      <EstadoCheckout volverA={AppRoutes.plan(planId)}>
        <View style={estilos.centro}>
          <CircularProgressIndicator />
        </View>
      </EstadoCheckout>
    );
  }
  const plan = vm.plan;
  if (vm.error !== null || plan === null) {
    return (
      <EstadoCheckout volverA={AppRoutes.plan(planId)}>
        <EmptyState
          icon="cloud_off_rounded"
          title="No pudimos cargar el plan"
          message="Revisa tu conexión e intenta de nuevo."
          action={<FilledButton variant="tonal" text="Reintentar" onPress={() => void vm.cargar()} />}
        />
      </EstadoCheckout>
    );
  }
  const fecha = vm.fecha;
  if (fecha === null) {
    return (
      <EstadoCheckout volverA={AppRoutes.plan(planId)}>
        <EmptyState
          icon="event_busy_rounded"
          title="Fecha no disponible"
          message="Esa fecha ya no está disponible. Elige otra salida de este plan."
          action={
            <FilledButton variant="tonal" text="Ver fechas del plan" onPress={() => irA(router, AppRoutes.plan(plan.id))} />
          }
        />
      </EstadoCheckout>
    );
  }
  return <CheckoutConPlanView plan={plan} fecha={fecha} />;
}

/** `Scaffold(AppBar('Confirmar y pagar'))` de los estados de carga. */
function EstadoCheckout({ children, volverA }: { children: ReactNode; volverA: string }) {
  const tema = useTheme();
  const router = useRouter();
  return (
    <View testID="pantalla-CheckoutView" style={[estilos.pantalla, { backgroundColor: tema.pageBackground }]}>
      <BarraSuperior titulo="Confirmar y pagar" onVolver={() => volverSeguro(router, volverA)} />
      {children}
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1 },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
