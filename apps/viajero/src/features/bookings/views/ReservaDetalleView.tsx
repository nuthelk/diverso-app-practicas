import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { BackHandler, ScrollView, StyleSheet, View } from 'react-native';

import type { Booking } from '@/core';
import { useDependencies } from '@/composition';
import { irA } from '@/features/checkout/ir-a';
import { useAbrirPago } from '@/features/checkout/useAbrirPago';
import { AvisoFlotante } from '@/features/compartido/aviso-flotante';
import { BarraSuperior } from '@/features/shell/components/BarraSuperior';
import { AppRoutes, volverSeguro } from '@/router';
import { EmptyState, FilledButton, Skeleton } from '@/ui/components';
import { AppInsets, useTheme } from '@/ui/theme';

import { useAccionesReserva } from '../acciones-reserva';
import { DetalleReserva } from '../components/DetalleReserva';
import { adelantarReserva, devolverResultado, reservaAdelantada, useAlVolver } from '../paso-entre-pantallas';
import { useReservaDetalleViewModel } from '../view-models/useReservaDetalleViewModel';

export interface ReservaDetalleViewProps {
  bookingId: string;
}

/**
 * `/reservas/:bookingId` (`ReservaDetalleView`): detalle de una reserva propia (estado, salida,
 * punto de encuentro, pago, itinerario, política y acciones). Si «Mis reservas» adelantó la
 * reserva se pinta de inmediato; sin ella (recarga en web, enlace directo) se carga por id.
 *
 * «Resultado al volver» (el `pop(cambio)` de Flutter): en cuanto hay un cambio (cancelación,
 * aunque el servidor la rechace; pago; reseña) se deja `true` para la lista con
 * `devolverResultado`; así vale también para el gesto atrás de iOS. El botón atrás de Android
 * (el `PopScope(canPop: false)`) pasa por el mismo «Volver»: sin pantalla previa lleva a «Mis
 * reservas» en vez de salir de la app.
 */
export function ReservaDetalleView({ bookingId }: ReservaDetalleViewProps) {
  const tema = useTheme();
  const router = useRouter();
  const { reservas, pasarela } = useDependencies();
  const inicial = useRef(reservaAdelantada(bookingId)).current;
  const vm = useReservaDetalleViewModel({ reservas, bookingId, inicial });
  const { abrirPago, modalPago } = useAbrirPago(pasarela);
  const { cancelarConConfirmacion, completarPago, dialogo } = useAccionesReserva(vm, abrirPago);
  const alVolver = useAlVolver();
  const { cargar, cambio, pagoIntentado, resenaPublicada } = vm;
  const montada = useRef(true);
  const rutaPropia = AppRoutes.reservaDetalle(bookingId);

  useEffect(() => {
    montada.current = true;
    if (inicial === null) void cargar();
    return () => {
      montada.current = false;
    };
    // Solo al montar (el `initState` de Flutter).
  }, []);

  useEffect(() => {
    if (cambio) devolverResultado(rutaPropia, true);
  }, [cambio, rutaPropia]);

  const volver = useCallback(() => volverSeguro(router, AppRoutes.reservas), [router]);

  useFocusEffect(
    useCallback(() => {
      const suscripcion = BackHandler.addEventListener('hardwareBackPress', () => {
        volver();
        return true;
      });
      return () => suscripcion.remove();
    }, [volver]),
  );

  const pagar = async (b: Booking) => {
    await completarPago(b);
    if (montada.current) await pagoIntentado();
  };

  const resenar = (b: Booking) => {
    adelantarReserva(b);
    alVolver(AppRoutes.resena(b.id), (reseno) => {
      if (reseno === true) resenaPublicada();
    });
    router.push(AppRoutes.resena(b.id) as Href);
  };

  /** Marco de las pantallas sin reserva (cargando / error): barra con «Volver». */
  const marco = (cuerpo: ReactNode) => (
    <View testID="pantalla-ReservaDetalleView" style={[estilos.flex, { backgroundColor: tema.pageBackground }]}>
      <BarraSuperior titulo={null} onVolver={volver} />
      <View style={estilos.flex}>{cuerpo}</View>
      <AvisoFlotante />
    </View>
  );

  const b = vm.reserva;
  if (b !== null) {
    return (
      <View testID="pantalla-ReservaDetalleView" style={estilos.flex}>
        <DetalleReserva
          booking={b}
          puedeCancelar={vm.puedeCancelar(b)}
          puedeResenar={vm.puedeResenar(b)}
          onVolver={volver}
          onCancelar={() => void cancelarConConfirmacion(b)}
          onPagar={() => void pagar(b)}
          onVerificar={() => irA(router, AppRoutes.pagoDeReserva(b.id))}
          onResenar={() => resenar(b)}
          onVerPlan={(planId) => router.push(AppRoutes.plan(planId) as Href)}
        />
        <AvisoFlotante />
        {dialogo}
        {modalPago}
      </View>
    );
  }
  if (vm.error !== null) {
    return marco(
      <EmptyState
        icono="cloud_off_rounded"
        titulo="No pudimos cargar la reserva"
        mensaje={vm.error}
        accion={<FilledButton variant="tonal" text="Reintentar" onPress={() => void cargar()} style={estilos.centro} />}
      />,
    );
  }
  return marco(
    <ScrollView contentContainerStyle={AppInsets.content} scrollEnabled={false}>
      <Skeleton height={190} radius={20} />
      <View style={{ height: 16 }} />
      <Skeleton height={28} width={220} />
      <View style={{ height: 12 }} />
      <Skeleton height={120} radius={20} />
    </ScrollView>,
  );
}

const estilos = StyleSheet.create({
  flex: { flex: 1 },
  centro: { alignSelf: 'center' },
});
