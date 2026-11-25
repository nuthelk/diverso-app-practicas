import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BookingStatus, formatCOP, type Booking } from '@/core';
import {
  CollapsibleHeader,
  FilledButton,
  Icon,
  OutlinedButton,
  PasoItinerario,
  SectionLabel,
  TarjetaCancelacion,
  Text,
  TextButton,
} from '@/ui/components';
import { AppInsets, AppRadii, AppText, withAlpha, useTheme } from '@/ui/theme';

import { cuentaRegresiva, textoPersonas, textoSalida } from '../reserva-formato';
import { FilaDato } from './FilaDato';
import { FotoReserva } from './FotoReserva';
import { ChipCodigo, EstadoReservaPill } from './Insignias';
import { colorReembolso } from './TarjetaReserva';

interface AccionesProps {
  booking: Booking;
  puedeCancelar: boolean;
  puedeResenar: boolean;
  onCancelar: () => void;
  onPagar: () => void;
  onVerificar: () => void;
  onResenar: () => void;
  onVerPlan: (planId: string) => void;
}

/**
 * Detalle de una reserva (`DetalleReserva`): cabecera colapsable (240) con la foto, título,
 * agencia, estado y código, el resumen, el itinerario, la política de cancelación y las acciones.
 */
export function DetalleReserva({ onVolver, ...props }: AccionesProps & { onVolver: () => void }) {
  const tema = useTheme();
  const cs = tema.colorScheme;
  const abajo = useSafeAreaInsets().bottom;
  const { booking } = props;
  const plan = booking.plan;
  const titulo = plan?.title ?? 'Plan';
  const agencia = plan?.agency?.name ?? null;

  return (
    <CollapsibleHeader
      title={titulo}
      expandedHeight={240}
      onBack={onVolver}
      background={<FotoReserva booking={booking} />}
    >
      <View style={{ paddingLeft: 22, paddingRight: 22, paddingTop: 20, paddingBottom: 28 + abajo }}>
        <Text height={1.15} style={{ fontSize: AppText.headingXl, fontWeight: '800', letterSpacing: -0.7 }}>
          {titulo}
        </Text>
        {agencia !== null ? (
          <View style={[estilos.fila, { marginTop: 8 }]}>
            <Icon name="storefront_outlined" size={16} color={cs.onSurfaceVariant} />
            <View style={{ width: 6 }} />
            <Text style={[estilos.flex, { fontSize: AppText.body, fontWeight: '600', color: cs.onSurfaceVariant }]}>
              {agencia}
            </Text>
          </View>
        ) : null}
        <View style={{ height: 14 }} />
        <View style={estilos.envolver}>
          <EstadoReservaPill booking={booking} />
          <ChipCodigo codigo={booking.code} />
        </View>
        <View style={{ height: 18 }} />
        <ResumenReserva booking={booking} />
        {plan !== null && plan.itinerary.length > 0 ? (
          <>
            <View style={{ height: 24 }} />
            <SectionLabel text="Itinerario" />
            {plan.itinerary.map((paso, i) => (
              <PasoItinerario key={i} paso={paso} ultimo={i === plan.itinerary.length - 1} />
            ))}
          </>
        ) : null}
        {plan !== null && plan.cancellationPolicy.length > 0 ? (
          <>
            <View style={{ height: 8 }} />
            <TarjetaCancelacion texto={plan.cancellationPolicy} />
          </>
        ) : null}
        <View style={{ height: 24 }} />
        <AccionesDetalleReserva {...props} />
      </View>
    </CollapsibleHeader>
  );
}

/**
 * Datos de la reserva en el detalle (`ResumenReserva`): salida con su cuenta regresiva, punto de
 * encuentro, personas y total, pago y reembolso (las filas que no aplican no se dibujan).
 */
function ResumenReserva({ booking }: { booking: Booking }) {
  const cs = useTheme().colorScheme;
  const salida = textoSalida(booking);
  const puntoEncuentro = booking.plan?.meetingPoint ?? '';
  const pago = booking.payment;
  const etiquetaReembolso = booking.refundLabel;
  return (
    <View style={[AppInsets.wideCard, { backgroundColor: cs.surfaceContainerLow, borderRadius: AppRadii.card }]}>
      {salida !== null ? (
        <>
          <FilaDato icono="event_rounded" texto={salida} acento={cuentaRegresiva(booking)} />
          <View style={{ height: 12 }} />
        </>
      ) : null}
      {puntoEncuentro.length > 0 ? (
        <>
          <FilaDato icono="place_outlined" texto={puntoEncuentro} />
          <View style={{ height: 12 }} />
        </>
      ) : null}
      <FilaDato icono="group_outlined" texto={`${textoPersonas(booking.pax)} · ${formatCOP(booking.totalAmount)}`} />
      {pago !== null ? (
        <>
          <View style={{ height: 12 }} />
          <FilaDato icono="credit_card_rounded" texto={pago.referenceText} />
        </>
      ) : null}
      {etiquetaReembolso !== null ? (
        <>
          <View style={{ height: 12 }} />
          <FilaDato icono="currency_exchange_rounded" texto={etiquetaReembolso} color={colorReembolso(booking, cs)} />
        </>
      ) : null}
    </View>
  );
}

/**
 * Acciones al pie del detalle (`AccionesDetalleReserva`): completar o verificar el pago si sigue
 * pendiente, reseñar (o el aviso de que ya se reseñó), «Ver plan» y «Cancelar». Cada botón solo
 * aparece si aplica.
 */
function AccionesDetalleReserva({
  booking,
  puedeCancelar,
  puedeResenar,
  onCancelar,
  onPagar,
  onVerificar,
  onResenar,
  onVerPlan,
}: AccionesProps) {
  const cs = useTheme().colorScheme;
  const planId = booking.plan?.id ?? booking.planDate?.planId ?? null;
  const pendiente = booking.status === BookingStatus.pendingPayment;
  return (
    <View style={estilos.columna}>
      {pendiente ? (
        <>
          <FilledButton text="Completar pago" onPress={onPagar} style={estilos.inicio} />
          <View style={{ height: 8 }} />
          <TextButton text="Ya pagué, verificar" onPress={onVerificar} style={estilos.inicio} />
          <View style={{ height: 8 }} />
        </>
      ) : null}
      {puedeResenar ? (
        <>
          <FilledButton variant="tonal" icon="star_outline_rounded" text="Reseñar" onPress={onResenar} style={estilos.inicio} />
          <View style={{ height: 10 }} />
        </>
      ) : booking.hasReview ? (
        <>
          <View style={estilos.fila}>
            <Icon name="rate_review_rounded" size={15} color={cs.primary} />
            <View style={{ width: 6 }} />
            <Text style={{ fontSize: AppText.detail, color: cs.primary }}>Ya dejaste tu reseña</Text>
          </View>
          <View style={{ height: 10 }} />
        </>
      ) : null}
      <View style={estilos.fila}>
        {planId !== null ? (
          <OutlinedButton text="Ver plan" onPress={() => onVerPlan(planId)} style={estilos.flex} />
        ) : null}
        {planId !== null && puedeCancelar ? <View style={{ width: 10 }} /> : null}
        {puedeCancelar ? (
          <OutlinedButton
            accessibilityLabel="Cancelar"
            onPress={onCancelar}
            style={[estilos.flex, { borderColor: withAlpha(cs.error, 0.5) }]}
          >
            <Text style={{ color: cs.error }}>Cancelar</Text>
          </OutlinedButton>
        ) : null}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  flex: { flex: 1 },
  fila: { flexDirection: 'row', alignItems: 'center' },
  columna: { alignItems: 'stretch' },
  inicio: { alignSelf: 'flex-start' },
  envolver: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 8, rowGap: 6 },
});
