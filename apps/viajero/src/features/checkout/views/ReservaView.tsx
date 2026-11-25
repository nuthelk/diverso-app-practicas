import { useRouter } from 'expo-router';
import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useDependencies } from '@/composition';
import { BookingStatus, noLineBreaks } from '@/core';
import { TopBar } from '@/features/shell/components/TopBar';
import { AppRoutes, volverSeguro } from '@/router';
import { CircularProgressIndicator, EmptyState, FilledButton } from '@/ui/components';
import { useTheme } from '@/ui/theme';

import { EntradaZoom } from '../components/Aparecer';
import { irA } from '../ir-a';
import { useReservaViewModel } from '../view-models/useReservaViewModel';
import { BookingSuccessView } from './BookingSuccessView';

export interface ReservaViewProps {
  bookingId: string;
}

/**
 * `/reserva/:bookingId`: confirmación cargada del backend (entra con «zoom»). Si la reserva sigue
 * pendiente de pago se manda a verificar el pago; si está cancelada, lo dice.
 */
export function ReservaView({ bookingId }: ReservaViewProps) {
  const router = useRouter();
  const { reservas } = useDependencies();
  const vm = useReservaViewModel({ reservas }, { bookingId });

  useEffect(() => {
    void vm.cargar();
  }, []);

  const reserva = vm.reserva;
  const pendienteDePago = !vm.cargando && reserva?.status === BookingStatus.pendingPayment ? reserva.id : null;
  useEffect(() => {
    if (pendienteDePago !== null) irA(router, AppRoutes.pagoDeReserva(pendienteDePago));
  }, [pendienteDePago, router]);

  const irAReservas = () => irA(router, AppRoutes.reservas);

  let contenido: ReactNode;
  if (vm.cargando) {
    contenido = <Estado><Cargando /></Estado>;
  } else if (vm.error !== null || reserva === null) {
    contenido = (
      <Estado>
        <EmptyState
          icon="cloud_off_rounded"
          title="No pudimos cargar la reserva"
          message={vm.error ?? ''}
          action={<FilledButton variant="tonal" text="Ver mis reservas" onPress={irAReservas} />}
        />
      </Estado>
    );
  } else {
    switch (reserva.status) {
      case BookingStatus.confirmed:
      case BookingStatus.completed:
        contenido = <BookingSuccessView booking={reserva} />;
        break;
      case BookingStatus.pendingPayment:
        contenido = <Estado><Cargando /></Estado>;
        break;
      case BookingStatus.cancelled: {
        const reembolso = reserva.refundLabel;
        contenido = (
          <Estado>
            <EmptyState
              icon="event_busy_rounded"
              title="Reserva cancelada"
              message={noLineBreaks(`La reserva ${reserva.code} está cancelada.${reembolso === null ? '' : ` ${reembolso}.`}`)}
              action={<FilledButton variant="tonal" text="Ver mis reservas" onPress={irAReservas} />}
            />
          </Estado>
        );
        break;
      }
    }
  }
  return <EntradaZoom testID="pantalla-ReservaView">{contenido}</EntradaZoom>;
}

/** `Scaffold(AppBar())`: barra vacía con «Volver» (sin historial, a Mis reservas). */
function Estado({ children }: { children: ReactNode }) {
  const tema = useTheme();
  const router = useRouter();
  return (
    <View style={[estilos.pantalla, { backgroundColor: tema.pageBackground }]}>
      <TopBar title="" onBack={() => volverSeguro(router, AppRoutes.reservas)} />
      {children}
    </View>
  );
}

function Cargando() {
  return (
    <View style={estilos.centro}>
      <CircularProgressIndicator />
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1 },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
