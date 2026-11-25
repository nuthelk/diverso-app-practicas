import { Pressable, StyleSheet, View } from 'react-native';

import { RefundStatus, formatCOP, type Booking } from '@/core';
import { Card, Divider, FilledButton, Icon, Text, TextButton } from '@/ui/components';
import { AppInsets, AppText, withAlpha, useTheme, type ColorScheme } from '@/ui/theme';

import { cuentaRegresiva, textoPersonas, textoSalida } from '../reserva-formato';
import { EncabezadoReserva } from './EncabezadoReserva';
import { FilaDato } from './FilaDato';

/** Color de la etiqueta de reembolso: rojo si fue rechazado, el primario en los demás casos. */
export function colorReembolso(b: Booking, cs: ColorScheme): string {
  return b.refund?.status === RefundStatus.rejected ? cs.error : cs.primary;
}

/**
 * Tarjeta de una reserva (`TarjetaReserva`), tocable (abre el detalle): foto del plan como
 * cabecera con la fecha de salida, el estado y el código encima; debajo el título y la agencia,
 * los datos que importan (salida con su cuenta regresiva y punto de encuentro), el reembolso, un
 * pie con personas y total, y las acciones. El historial se ve más apagado.
 *
 * Accesibilidad: la parte tocable se anuncia como botón «Ver detalle de la reserva {codigo}»; las
 * acciones quedan FUERA de ella (en RN un botón dentro de otro elemento accesible no se puede
 * enfocar con el lector de pantalla).
 */
export function TarjetaReserva({
  booking,
  onAbrir,
  historial = false,
  onResenar,
  onCancelar,
  onPagar,
  onVerificar,
}: {
  booking: Booking;
  onAbrir: () => void;
  historial?: boolean;
  onResenar?: (() => void) | null;
  onCancelar?: (() => void) | null;
  onPagar?: (() => void) | null;
  onVerificar?: (() => void) | null;
}) {
  const tema = useTheme();
  const cs = tema.colorScheme;
  const agencia = booking.plan?.agency?.name ?? null;
  const salida = textoSalida(booking);
  const puntoEncuentro = booking.plan?.meetingPoint ?? '';
  const colorTexto = historial ? withAlpha(cs.onSurface, 0.72) : cs.onSurface;
  const etiquetaReembolso = booking.refundLabel;
  const conPago = !!onPagar || !!onVerificar;
  const conAcciones = !!onResenar || !!onCancelar;

  return (
    <View style={AppInsets.betweenCards}>
      <Card color={cs.surfaceContainerLow}>
        <Pressable
          onPress={onAbrir}
          accessibilityRole="button"
          accessibilityLabel={`Ver detalle de la reserva ${booking.code}`}
        >
          {({ pressed }) => (
            <>
              <EncabezadoReserva booking={booking} apagado={historial} />
              <View style={estilos.cuerpo}>
                <Text
                  numberOfLines={2}
                  ellipsizeMode="tail"
                  height={1.25}
                  style={{ fontWeight: '700', fontSize: AppText.subtitle, color: colorTexto }}
                >
                  {booking.plan?.title ?? 'Plan'}
                </Text>
                {agencia !== null ? (
                  <>
                    <View style={{ height: 4 }} />
                    <View style={estilos.fila}>
                      <Icon name="storefront_outlined" size={14} color={cs.onSurfaceVariant} />
                      <View style={{ width: 5 }} />
                      <Text
                        numberOfLines={1}
                        ellipsizeMode="tail"
                        style={[estilos.flex, { fontSize: AppText.largeCaption, fontWeight: '600', color: cs.onSurfaceVariant }]}
                      >
                        {agencia}
                      </Text>
                    </View>
                  </>
                ) : null}
                <View style={{ height: 12 }} />
                {salida !== null ? (
                  <FilaDato icono="event_rounded" texto={salida} acento={cuentaRegresiva(booking)} compacto />
                ) : null}
                {puntoEncuentro.length > 0 ? (
                  <>
                    <View style={{ height: 6 }} />
                    <FilaDato icono="place_outlined" texto={puntoEncuentro} compacto />
                  </>
                ) : null}
                {etiquetaReembolso !== null ? (
                  <>
                    <View style={{ height: 6 }} />
                    <FilaDato
                      icono="currency_exchange_rounded"
                      texto={etiquetaReembolso}
                      color={colorReembolso(booking, cs)}
                      compacto
                    />
                  </>
                ) : null}
                <View style={{ height: 12 }} />
                <Divider color={cs.outlineVariant} />
                <View style={{ height: 12 }} />
                {/* Se parte en dos líneas con letra muy grande en vez de desbordar. */}
                <View style={estilos.pie}>
                  <View style={estilos.fila}>
                    <Icon name="group_outlined" size={16} color={cs.onSurfaceVariant} />
                    <View style={{ width: 6 }} />
                    <Text style={{ fontSize: AppText.detail, color: cs.onSurfaceVariant }}>
                      {textoPersonas(booking.pax)}
                    </Text>
                  </View>
                  <Text
                    style={{ fontSize: AppText.largeSubtitle, fontWeight: '800', letterSpacing: -0.3, color: colorTexto }}
                  >
                    {formatCOP(booking.totalAmount)}
                  </Text>
                </View>
              </View>
              {pressed ? (
                <View
                  pointerEvents="none"
                  style={[StyleSheet.absoluteFill, { backgroundColor: withAlpha(cs.onSurface, tema.components.pressedOpacity) }]}
                />
              ) : null}
            </>
          )}
        </Pressable>
        {conPago || conAcciones || booking.hasReview ? (
          <View style={estilos.acciones}>
            {conPago ? (
              <View style={[estilos.envolver, { marginTop: 10 }]}>
                {onVerificar ? <TextButton texto="Ya pagué, verificar" onPress={onVerificar} /> : null}
                {onPagar ? (
                  <FilledButton variante="tonal" texto="Completar pago" onPress={onPagar} style={estilos.boton38} />
                ) : null}
              </View>
            ) : null}
            {conAcciones ? (
              <View style={[estilos.envolver, { marginTop: 10 }]}>
                {onResenar ? (
                  <FilledButton
                    variante="tonal"
                    onPress={onResenar}
                    accessibilityLabel="Reseñar"
                    style={[estilos.boton38, { paddingHorizontal: 14 }]}
                  >
                    <Icon name="star_outline_rounded" size={16} color={cs.onSecondaryContainer} />
                    <Text>Reseñar</Text>
                  </FilledButton>
                ) : null}
                {onCancelar ? (
                  <TextButton onPress={onCancelar} accessibilityLabel="Cancelar" style={estilos.boton38}>
                    <Text style={{ color: cs.error }}>Cancelar</Text>
                  </TextButton>
                ) : null}
              </View>
            ) : booking.hasReview ? (
              <View style={[estilos.fila, { marginTop: 8 }]}>
                <Icon name="rate_review_rounded" size={13} color={cs.primary} />
                <View style={{ width: 4 }} />
                <Text style={{ fontSize: AppText.caption, color: cs.primary }}>Ya dejaste tu reseña</Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </Card>
    </View>
  );
}

const estilos = StyleSheet.create({
  flex: { flex: 1 },
  cuerpo: { paddingLeft: 16, paddingRight: 16, paddingTop: 14, paddingBottom: 14 },
  fila: { flexDirection: 'row', alignItems: 'center' },
  pie: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    columnGap: 12,
    rowGap: 4,
  },
  // Las acciones siguen el cuerpo (14 abajo en Flutter van tras el pie: aquí debajo, mismo aire).
  acciones: { paddingLeft: 16, paddingRight: 16, paddingBottom: 14, marginTop: -14 },
  envolver: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', columnGap: 8, rowGap: 4 },
  boton38: { minHeight: 38 },
});
