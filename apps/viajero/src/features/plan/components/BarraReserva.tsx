import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, View, type TextStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatCOP, formatShortDate, type Plan, type PlanDate } from '@/core';
import { FilledButton, Icono, Text, TextButton } from '@/ui/components';
import { AppRadios, AppText, conAlfa, Curvas, Duraciones, useTheme } from '@/ui/theme';

/** Pocos cupos: desde aquí hacia abajo se avisa «¡Últimos N!». */
const POCOS_CUPOS = 4;

/**
 * Barra inferior de la ficha (`barra_reserva.dart`): fechas con sus cupos, precio y «Reservar» de
 * la fecha elegida. No guarda estado (la fecha la maneja el view model). Va DEBAJO del scroll y
 * respeta la barra de gestos (gotcha 14). Sin fechas, avisa y ofrece «Ver otros planes».
 */
export function BarraReserva({
  plan,
  fechas,
  seleccionada,
  onSeleccionar,
  onReservar,
  onVerOtros,
}: {
  plan: Plan;
  fechas: readonly PlanDate[];
  /** Null solo cuando no hay fechas. */
  seleccionada: PlanDate | null;
  onSeleccionar: (fecha: PlanDate) => void;
  onReservar: (fecha: PlanDate) => void;
  onVerOtros: () => void;
}) {
  const tema = useTheme();
  const cs = tema.colorScheme;
  const insets = useSafeAreaInsets();
  const superficie = { backgroundColor: tema.fondoPagina, borderTopColor: conAlfa(cs.outlineVariant, 0.5) };

  if (seleccionada === null) {
    return (
      <View testID="barra-reserva" style={[estilos.superficie, superficie]}>
        <View style={[estilos.sinFechas, { paddingBottom: 16 + insets.bottom }]}>
          <Icono nombre="event_busy_rounded" color={cs.onSurfaceVariant} />
          <View style={{ width: 10 }} />
          <Text style={{ flex: 1, fontWeight: '600' }}>Sin fechas disponibles por ahora</Text>
          {/* Se encoge: en celulares angostos o con letra grande parte su texto en vez de desbordar. */}
          <TextButton texto="Ver otros planes" onPress={onVerOtros} style={estilos.encogible} />
        </View>
      </View>
    );
  }

  // SafeArea(minimum: 20, 10, 20, 12): el mayor entre el inset del sistema y el mínimo.
  return (
    <View testID="barra-reserva" style={[estilos.superficie, superficie]}>
      <View
        style={{
          paddingLeft: Math.max(20, insets.left),
          paddingRight: Math.max(20, insets.right),
          paddingTop: 10,
          paddingBottom: Math.max(12, insets.bottom),
        }}
      >
        <ScrollView
          testID="fechas-reserva"
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ height: 62 }}
          contentContainerStyle={estilos.fechas}
        >
          {fechas.map((f) => (
            <ChipFecha key={f.id} fecha={f} seleccionada={f.id === seleccionada.id} onPress={() => onSeleccionar(f)} />
          ))}
        </ScrollView>
        <View style={{ height: 10 }} />
        <View style={estilos.fila}>
          <View>
            <Text style={{ fontSize: AppText.encabezadoL, fontWeight: '800', letterSpacing: -0.5, color: cs.onSurface }}>
              {formatCOP(plan.priceCop)}
            </Text>
            <Text style={{ fontSize: AppText.micro, color: cs.onSurfaceVariant }}>por persona · precio final</Text>
          </View>
          <View style={{ flex: 1 }} />
          <FilledButton icono="lock_outline_rounded" texto="Reservar" onPress={() => onReservar(seleccionada)} style={estilos.reservar} />
        </View>
      </View>
    </View>
  );
}

/** Chip de una fecha con sus cupos; el cambio de selección se anima 160 ms easeOut. */
function ChipFecha({ fecha, seleccionada, onPress }: { fecha: PlanDate; seleccionada: boolean; onPress: () => void }) {
  const tema = useTheme();
  const cs = tema.colorScheme;
  const t = useRef(new Animated.Value(seleccionada ? 1 : 0)).current;
  useEffect(() => {
    const animacion = Animated.timing(t, {
      toValue: seleccionada ? 1 : 0,
      duration: Duraciones.chipFecha,
      easing: Curvas.easeOut.fn,
      useNativeDriver: false,
    });
    animacion.start();
    return () => animacion.stop();
  }, [seleccionada, t]);
  const pocos = fecha.availableSpots <= POCOS_CUPOS;
  const cupos = pocos ? `¡Últimos ${fecha.availableSpots}!` : `${fecha.availableSpots} cupos`;
  return (
    <Pressable
      testID={`fecha-${fecha.id}`}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${formatShortDate(fecha.date)}, ${cupos}`}
      accessibilityState={{ selected: seleccionada }}
    >
      <Animated.View
        style={[
          estilos.chip,
          { backgroundColor: t.interpolate({ inputRange: [0, 1], outputRange: [cs.surfaceContainerHigh, cs.primary] }) },
        ]}
      >
        <TextoSinCorte estilo={{ fontSize: AppText.detalle, fontWeight: '700', color: seleccionada ? cs.onPrimary : cs.onSurface }}>
          {formatShortDate(fecha.date)}
        </TextoSinCorte>
        <TextoSinCorte
          estilo={{
            fontSize: AppText.nota,
            fontWeight: '600',
            color: seleccionada ? conAlfa(cs.onPrimary, 0.8) : pocos ? tema.diverso.pocosCupos : cs.onSurfaceVariant,
          }}
        >
          {cupos}
        </TextoSinCorte>
      </Animated.View>
    </Pressable>
  );
}

/** Lo que el texto visible puede pasarse del ancho medido (cae sobre el padding de 14 del chip). */
const HOLGURA = 8;

/**
 * Texto de una línea que no se corta aunque Android lo mida unos px más angosto de lo que lo dibuja
 * (pasaba con «jue, 26 nov»: partía «nov» a una segunda línea que el chip recortaba). Una copia
 * invisible y oculta a los lectores de pantalla da el ancho; la visible va encima en UNA línea, con
 * [HOLGURA] de más a la derecha. El tamaño no depende de la selección: solo cambia el color.
 */
function TextoSinCorte({ estilo, children }: { estilo: TextStyle; children: ReactNode }) {
  return (
    <View>
      <Text
        style={[estilo, estilos.medida]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {children}
      </Text>
      <Text numberOfLines={1} style={[estilo, estilos.visible]}>
        {children}
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  superficie: { borderTopWidth: 1 },
  sinFechas: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16 },
  encogible: { flexShrink: 1 },
  fechas: { gap: 8, alignItems: 'stretch' },
  chip: { height: 62, justifyContent: 'center', paddingHorizontal: 14, borderRadius: AppRadios.field },
  medida: { opacity: 0 },
  visible: { position: 'absolute', left: 0, top: 0, right: -HOLGURA },
  fila: { flexDirection: 'row', alignItems: 'center' },
  reservar: { minWidth: 150, minHeight: 52 },
});
