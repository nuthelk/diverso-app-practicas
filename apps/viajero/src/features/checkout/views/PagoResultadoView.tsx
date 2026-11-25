import { useRouter } from 'expo-router';
import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useDependencies } from '@/composition';
import { BookingStatus, VerifiedPaymentStatus, type DiversoError, type VerifiedPayment } from '@/core';
import { BarraSuperior } from '@/features/shell/components/BarraSuperior';
import { AppRoutes, volverSeguro } from '@/router';
import { CircularProgressIndicator, EmptyState, FilledButton, Text, TextButton } from '@/ui/components';
import { useTheme } from '@/ui/theme';

import { irA } from '../ir-a';
import { useAbrirPago } from '../useAbrirPago';
import { usePagoResultadoViewModel, type PagoResultadoViewModel } from '../view-models/usePagoResultadoViewModel';

export interface PagoResultadoViewProps {
  /** `?id=`: transacción de Wompi (vuelta del checkout). */
  transactionId: string | null;
  /** `?reserva=`: «Ya pagué, verificar» de una reserva. */
  bookingId: string | null;
}

/**
 * `/pago/resultado`: destino de la redirección de Wompi (`?id=<transacción>`) o del «Ya pagué,
 * verificar» (`?reserva=<id>`). Verifica en el servidor (nunca da por pagado por la redirección) y
 * lleva a la confirmación (`/reserva/:id`) si el pago fue aprobado. Sin datos, a Mis reservas.
 */
export function PagoResultadoView({ transactionId, bookingId }: PagoResultadoViewProps) {
  const tema = useTheme();
  const router = useRouter();
  const { pasarela } = useDependencies();
  const vm = usePagoResultadoViewModel({ pasarela }, { transactionId, bookingId });
  const { abrirPago, modalPago } = useAbrirPago(pasarela);

  useEffect(() => {
    // `addPostFrameCallback` de Dart: tras el primer pintado.
    if (vm.sinDatos) irA(router, AppRoutes.reservas);
    else void vm.verificar();
  }, []);

  // El listener de Dart: aprobado y ya sin cargar → confirmación.
  const aprobado = !vm.cargando && vm.resultado?.status === VerifiedPaymentStatus.approved ? vm.resultado.bookingId : null;
  useEffect(() => {
    if (aprobado !== null) irA(router, AppRoutes.reserva(aprobado));
  }, [aprobado, router]);

  return (
    <View testID="pantalla-PagoResultadoView" style={[estilos.pantalla, { backgroundColor: tema.pageBackground }]}>
      <BarraSuperior titulo="Resultado del pago" onVolver={() => volverSeguro(router, AppRoutes.reservas)} />
      <Contenido vm={vm} irAReservas={() => irA(router, AppRoutes.reservas)} reintentar={(id) => void vm.intentarDeNuevo(id, abrirPago)} />
      {modalPago}
    </View>
  );
}

function Contenido({
  vm,
  irAReservas,
  reintentar,
}: {
  vm: PagoResultadoViewModel;
  irAReservas: () => void;
  reintentar: (bookingId: string) => void;
}) {
  if (vm.sinDatos || vm.cargando || vm.resultado?.status === VerifiedPaymentStatus.approved) {
    return (
      <View style={estilos.centro}>
        <CircularProgressIndicator />
        <View style={{ height: 16 }} />
        <Text style={estilos.centrado}>
          {vm.intentos > 1
            ? `Esperando a que Wompi confirme tu pago de prueba… (intento ${vm.intentos})`
            : 'Confirmando tu pago de prueba con Wompi…'}
        </Text>
      </View>
    );
  }
  if (vm.falla !== null) return <ErrorVerificacion falla={vm.falla} verificar={() => void vm.verificar()} irAReservas={irAReservas} />;
  return (
    <ResultadoNoAprobado
      r={vm.resultado!}
      vm={vm}
      irAReservas={irAReservas}
      reintentar={reintentar}
    />
  );
}

function ErrorVerificacion({
  falla,
  verificar,
  irAReservas,
}: {
  falla: DiversoError;
  verificar: () => void;
  irAReservas: () => void;
}) {
  const definitivo = falla.approvedLate || falla.code === 'MONTO_NO_COINCIDE';
  return (
    <EmptyState
      icono={falla.approvedLate ? 'history_toggle_off_rounded' : 'error_outline_rounded'}
      titulo={falla.approvedLate ? 'Tu reserva había vencido' : 'No pudimos verificar el pago'}
      mensaje={falla.userMessage}
      accion={
        <Acciones>
          {!definitivo ? <FilledButton text="Reintentar" onPress={verificar} /> : null}
          <VerReservas principal={definitivo} onPress={irAReservas} />
        </Acciones>
      }
    />
  );
}

function ResultadoNoAprobado({
  r,
  vm,
  irAReservas,
  reintentar,
}: {
  r: VerifiedPayment;
  vm: PagoResultadoViewModel;
  irAReservas: () => void;
  reintentar: (bookingId: string) => void;
}) {
  const pendiente = r.status === VerifiedPaymentStatus.pending;
  const puedeReintentar = !pendiente && r.bookingStatus === BookingStatus.pendingPayment;
  const mensaje = pendiente
    ? 'Todavía no recibimos la confirmación de Wompi. Te avisaremos en Mis reservas cuando llegue.'
    : r.bookingStatus === BookingStatus.pendingPayment
      ? r.userMessage
      : `${r.userMessage} Tu reserva ya no está vigente; vuelve a reservar.`;
  return (
    <EmptyState
      icono={pendiente ? 'hourglass_top_rounded' : 'credit_card_off_rounded'}
      titulo={pendiente ? 'Pago pendiente' : 'El pago no se completó'}
      mensaje={mensaje}
      detalle={vm.errorReintento}
      accion={
        <Acciones>
          {puedeReintentar ? (
            <FilledButton
              text="Intentar de nuevo"
              onPress={vm.reintentandoPago ? null : () => reintentar(r.bookingId)}
            />
          ) : null}
          {pendiente ? <FilledButton text="Verificar de nuevo" onPress={() => void vm.verificar()} /> : null}
          <VerReservas principal={!puedeReintentar && !pendiente} onPress={irAReservas} />
        </Acciones>
      }
    />
  );
}

function VerReservas({ principal, onPress }: { principal: boolean; onPress: () => void }) {
  return principal ? (
    <FilledButton text="Ver mis reservas" onPress={onPress} />
  ) : (
    <TextButton text="Ver mis reservas" onPress={onPress} />
  );
}

/** Botones apilados con 8 de separación (cada uno con su ancho propio, centrados). */
function Acciones({ children }: { children: ReactNode }) {
  const botones = (Array.isArray(children) ? children : [children]).filter(Boolean);
  return (
    <View style={estilos.acciones}>
      {botones.map((b, i) => (
        <View key={i} style={{ paddingBottom: 8 }}>
          {b}
        </View>
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1 },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centrado: { textAlign: 'center' },
  acciones: { alignItems: 'center' },
});
