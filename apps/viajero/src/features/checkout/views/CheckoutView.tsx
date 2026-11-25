import { useCanGoBack, useRouter } from 'expo-router';
import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useDependencies } from '@/composition';
import { BarraSuperior } from '@/features/shell/components/BarraSuperior';
import { AppRoutes } from '@/router';
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
      <EstadoCheckout>
        <View style={estilos.centro}>
          <CircularProgressIndicator />
        </View>
      </EstadoCheckout>
    );
  }
  const plan = vm.plan;
  if (vm.error !== null || plan === null) {
    return (
      <EstadoCheckout>
        <EmptyState
          icono="cloud_off_rounded"
          titulo="No pudimos cargar el plan"
          mensaje="Revisa tu conexión e intenta de nuevo."
          accion={<FilledButton variante="tonal" texto="Reintentar" onPress={() => void vm.cargar()} />}
        />
      </EstadoCheckout>
    );
  }
  const fecha = vm.fecha;
  if (fecha === null) {
    return (
      <EstadoCheckout>
        <EmptyState
          icono="event_busy_rounded"
          titulo="Fecha no disponible"
          mensaje="Esa fecha ya no está disponible. Elige otra salida de este plan."
          accion={
            <FilledButton variante="tonal" texto="Ver fechas del plan" onPress={() => irA(router, AppRoutes.plan(plan.id))} />
          }
        />
      </EstadoCheckout>
    );
  }
  return <CheckoutConPlanView plan={plan} fecha={fecha} />;
}

/** `Scaffold(AppBar('Confirmar y pagar'))` de los estados de carga. */
function EstadoCheckout({ children }: { children: ReactNode }) {
  const tema = useTheme();
  const router = useRouter();
  const hayHistorial = useCanGoBack();
  return (
    <View testID="pantalla-CheckoutView" style={[estilos.pantalla, { backgroundColor: tema.fondoPagina }]}>
      <BarraSuperior titulo="Confirmar y pagar" onVolver={hayHistorial ? () => router.back() : null} />
      {children}
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1 },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
