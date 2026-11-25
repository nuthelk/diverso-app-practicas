import { useRouter } from 'expo-router';
import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useDependencies } from '@/composition';
import { BookingStatus } from '@/core';
import { BarraSuperior } from '@/features/shell/components/BarraSuperior';
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
  const pendienteDePago = !vm.cargando && reserva?.estado === BookingStatus.pendientePago ? reserva.id : null;
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
          icono="cloud_off_rounded"
          titulo="No pudimos cargar la reserva"
          mensaje={vm.error ?? ''}
          accion={<FilledButton variante="tonal" texto="Ver mis reservas" onPress={irAReservas} />}
        />
      </Estado>
    );
  } else {
    switch (reserva.estado) {
      case BookingStatus.confirmada:
      case BookingStatus.completada:
        contenido = <BookingSuccessView booking={reserva} />;
        break;
      case BookingStatus.pendientePago:
        contenido = <Estado><Cargando /></Estado>;
        break;
      case BookingStatus.cancelada: {
        const reembolso = reserva.etiquetaReembolso;
        contenido = (
          <Estado>
            <EmptyState
              icono="event_busy_rounded"
              titulo="Reserva cancelada"
              mensaje={`La reserva ${reserva.codigo} está cancelada.${reembolso === null ? '' : ` ${reembolso}.`}`}
              accion={<FilledButton variante="tonal" texto="Ver mis reservas" onPress={irAReservas} />}
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
    <View style={[estilos.pantalla, { backgroundColor: tema.fondoPagina }]}>
      <BarraSuperior titulo="" onVolver={() => volverSeguro(router, AppRoutes.reservas)} />
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
