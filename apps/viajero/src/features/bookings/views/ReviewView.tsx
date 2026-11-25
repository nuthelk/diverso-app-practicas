import { useRouter } from 'expo-router';
import { useEffect, useRef, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useDependencies } from '@/composition';
import { irA } from '@/features/checkout/ir-a';
import { Snackbar, showSnackbar } from '@/features/shared/snackbar';
import { BarraSuperior } from '@/features/shell/components/BarraSuperior';
import { AppRoutes, volverSeguro } from '@/router';
import { CircularProgressIndicator, EmptyState, FilledButton, TextButton } from '@/ui/components';
import { useTheme } from '@/ui/theme';

import { FormularioResena } from '../components/FormularioResena';
import { devolverResultado, reservaAdelantada } from '../paso-entre-pantallas';
import { useReviewViewModel } from '../view-models/useReviewViewModel';

export interface ReviewViewProps {
  bookingId: string;
}

/**
 * `/resena/:bookingId` (`ReviewLoader` + `ReviewView` de Flutter): carga la reserva por id, así
 * la pantalla se reconstruye igual tras recargar la página en web; la reserva adelantada por
 * «Mis reservas» o el detalle solo evita la espera. Si la reserva no se puede reseñar (aún no
 * viajó, ya reseñada, no confirmada) lo dice en vez de dejar escribir una reseña que el servidor
 * rechazaría. Al publicar avisa «¡Gracias!…», devuelve `true` a quien la abrió (el `pop(true)`)
 * y vuelve; abierta en frío, va a «Mis reservas».
 */
export function ReviewView({ bookingId }: ReviewViewProps) {
  const tema = useTheme();
  const router = useRouter();
  const { reservas, resenas } = useDependencies();
  const adelantada = useRef(reservaAdelantada(bookingId)).current;
  const vm = useReviewViewModel({ reservas, resenas, bookingId, adelantada });
  const { cargar, errorEnvio } = vm;

  useEffect(() => {
    void cargar();
  }, [cargar]);

  // Si el servidor la rechaza, el motivo va en un aviso (se puede reintentar).
  useEffect(() => {
    if (errorEnvio !== null) showSnackbar(errorEnvio);
  }, [errorEnvio]);

  const enviar = async (comentario: string) => {
    if (!(await vm.enviar(comentario))) return;
    showSnackbar('¡Gracias! Tu reseña ayudará a otros viajeros.');
    devolverResultado(AppRoutes.resena(bookingId), true);
    volverSeguro(router, AppRoutes.reservas);
  };

  const irAMisReservas = () => irA(router, AppRoutes.reservas);

  let cuerpo: ReactNode;
  if (vm.cargando) {
    cuerpo = (
      <View style={estilos.centro}>
        <CircularProgressIndicator />
      </View>
    );
  } else if (vm.error !== null) {
    cuerpo = (
      <EmptyState
        icon="cloud_off_rounded"
        title="No pudimos cargar la reserva"
        message={vm.error}
        action={
          <View style={estilos.acciones}>
            <FilledButton variant="tonal" text="Reintentar" onPress={() => void cargar()} />
            <TextButton text="Ver mis reservas" onPress={irAMisReservas} />
          </View>
        }
      />
    );
  } else if (!vm.puedeResenar) {
    cuerpo = (
      <EmptyState
        icon="rate_review_outlined"
        title="Esta reserva no se puede reseñar"
        message="Solo se reseñan los viajes ya realizados que aún no tienen reseña."
        action={<FilledButton variant="tonal" text="Ver mis reservas" onPress={irAMisReservas} />}
      />
    );
  } else {
    cuerpo = <FormularioResena vm={vm} onEnviar={(comentario) => void enviar(comentario)} />;
  }

  return (
    <View testID="pantalla-ReviewView" style={[estilos.flex, { backgroundColor: tema.pageBackground }]}>
      <BarraSuperior titulo="Tu reseña" onVolver={() => volverSeguro(router, AppRoutes.reservas)} />
      <View style={estilos.flex}>{cuerpo}</View>
      <Snackbar />
    </View>
  );
}

const estilos = StyleSheet.create({
  flex: { flex: 1 },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  acciones: { alignItems: 'center' },
});
