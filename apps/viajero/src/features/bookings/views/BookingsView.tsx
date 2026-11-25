import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { BookingStatus, type Booking } from '@/core';
import { useDependencies } from '@/composition';
import { useAbrirPago } from '@/features/checkout/useAbrirPago';
import { irA } from '@/features/checkout/ir-a';
import { AvisoFlotante } from '@/features/compartido/aviso-flotante';
import { BarraSuperior } from '@/features/shell/components/BarraSuperior';
import { AppRoutes } from '@/router';
import { EmptyState, FilledButton, Text, TituloPagina } from '@/ui/components';
import { useTheme } from '@/ui/theme';

import { useAccionesReserva } from '../acciones-reserva';
import { PestanasReservas } from '../components/PestanasReservas';
import { ReservasSkeleton } from '../components/ReservasSkeleton';
import { TarjetaReserva } from '../components/TarjetaReserva';
import { adelantarReserva, olvidarReservaAdelantada, useAlVolver } from '../paso-entre-pantallas';
import { useBookingsViewModel } from '../view-models/useBookingsViewModel';

/**
 * Pestaña «Reservas» (`BookingsView`): próximas e historial con acciones de pago, reseña y
 * cancelación. El estado vive en `useBookingsViewModel` (MVVM).
 *
 * Conserva su estado al cambiar de pestaña (el shell no la desmonta: keep-alive). Al volver del
 * detalle o de la reseña SOLO se recarga si informan cambios (el detalle, «hubo cambios»; la reseña,
 * «publicada»), y en segundo plano: la lista sigue montada (sin esqueleto) y no pierde el
 * desplazamiento. En Flutter se recargaba siempre al volver de la reseña; esto es deliberado. Ver
 * `paso-entre-pantallas.ts`.
 */
export function BookingsView() {
  const tema = useTheme();
  const cs = tema.colorScheme;
  const router = useRouter();
  const { reservas, pasarela } = useDependencies();
  const vm = useBookingsViewModel({ reservas });
  const { abrirPago, modalPago } = useAbrirPago(pasarela);
  const { cancelarConConfirmacion, completarPago, dialogo } = useAccionesReserva(vm, abrirPago);
  const alVolver = useAlVolver();
  const [pestana, setPestana] = useState(0);
  const { cargar, refrescar } = vm;

  useEffect(() => {
    void cargar();
  }, [cargar]);

  // De vuelta en la lista, la reserva que se adelantó al detalle ya no hace falta.
  useFocusEffect(useCallback(() => olvidarReservaAdelantada(), []));

  const abrirDetalle = (b: Booking) => {
    adelantarReserva(b);
    alVolver(AppRoutes.reservaDetalle(b.id), (cambio) => {
      if (cambio === true) void refrescar();
    });
    router.push(AppRoutes.reservaDetalle(b.id) as Href);
  };

  const resenar = (b: Booking) => {
    adelantarReserva(b);
    alVolver(AppRoutes.resena(b.id), (publicada) => {
      if (publicada === true) void refrescar();
    });
    router.push(AppRoutes.resena(b.id) as Href);
  };

  const lista = (reservasDeLaPestana: Booking[], historial: boolean) => (
    <FlatList
      testID="lista-reservas"
      data={reservasDeLaPestana}
      keyExtractor={(b) => b.id}
      contentContainerStyle={estilos.lista}
      refreshControl={<RefreshControl refreshing={false} onRefresh={() => void cargar()} colors={[cs.primary]} tintColor={cs.primary} />}
      renderItem={({ item: b }) => {
        const pendiente = b.estado === BookingStatus.pendientePago;
        return (
          <TarjetaReserva
            booking={b}
            historial={historial}
            onAbrir={() => abrirDetalle(b)}
            onResenar={vm.puedeResenar(b) ? () => resenar(b) : null}
            onPagar={pendiente ? () => void completarPago(b) : null}
            onVerificar={pendiente ? () => irA(router, AppRoutes.pagoDeReserva(b.id)) : null}
            onCancelar={vm.puedeCancelar(b) ? () => void cancelarConConfirmacion(b) : null}
          />
        );
      }}
    />
  );

  const cuerpo = vm.cargando ? (
    <ReservasSkeleton />
  ) : vm.error !== null ? (
    <EmptyState
      icono="cloud_off_rounded"
      titulo="Sin conexión"
      mensaje={vm.error}
      accion={<FilledButton variante="tonal" texto="Reintentar" onPress={() => void cargar()} style={estilos.accion} />}
    />
  ) : vm.reservas.length === 0 ? (
    <EmptyState
      icono="luggage_rounded"
      titulo="Aún no tienes reservas"
      mensaje="Cuando reserves un plan, aquí verás tu código, la fecha y el itinerario."
    />
  ) : pestana === 0 && vm.activas.length === 0 ? (
    // Sin viajes próximos: en vez de una línea suelta, invita a ir a «Explorar» (pestaña que ya
    // existe: `navigate`, no se apila otra encima).
    <EmptyState
      icono="explore_rounded"
      titulo="Sin viajes próximos"
      mensaje="¡Hora de explorar!"
      accion={
        <FilledButton
          variante="tonal"
          texto="Explorar planes"
          onPress={() => router.navigate(AppRoutes.explorar as Href)}
          style={estilos.accion}
        />
      }
    />
  ) : pestana === 0 ? (
    lista(vm.activas, false)
  ) : vm.historial.length === 0 ? (
    <ScrollView contentContainerStyle={estilos.vacio}>
      <Text style={{ color: cs.onSurfaceVariant, textAlign: 'center' }}>Todavía no hay historial.</Text>
    </ScrollView>
  ) : (
    lista(vm.historial, true)
  );

  return (
    <View testID="pantalla-BookingsView" style={[estilos.flex, { backgroundColor: tema.fondoPagina }]}>
      {/* AppBar + pestañas fuera del área de la lista: las tarjetas no pueden pasar por encima. */}
      <BarraSuperior titulo={<TituloPagina texto="Mis reservas" />} />
      <PestanasReservas
        pestanas={[`Próximas (${vm.activas.length})`, `Historial (${vm.historial.length})`]}
        seleccionada={pestana}
        onCambio={setPestana}
      />
      <View style={estilos.flex}>{cuerpo}</View>
      <AvisoFlotante sobreBarraInferior />
      {dialogo}
      {modalPago}
    </View>
  );
}

const estilos = StyleSheet.create({
  flex: { flex: 1 },
  lista: { paddingLeft: 20, paddingTop: 12, paddingRight: 20, paddingBottom: 24 },
  vacio: { paddingTop: 120, paddingHorizontal: 20, alignItems: 'center' },
  accion: { alignSelf: 'center' },
});
