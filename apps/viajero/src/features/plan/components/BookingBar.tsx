import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, View, type TextStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatCOP, formatShortDate, type Plan, type PlanDate } from '@/core';
import { FilledButton, Icon, Text, TextButton } from '@/ui/components';
import { AppRadii, AppText, withAlpha, Curves, Durations, useTheme } from '@/ui/theme';

/** Pocos cupos: desde aquí hacia abajo se avisa «¡Últimos N!». */
const FEW_SPOTS = 4;

/**
 * Barra inferior de la ficha (`barra_reserva.dart`): fechas con sus cupos, precio y «Reservar» de
 * la fecha elegida. No guarda estado (la fecha la maneja el view model). Va DEBAJO del scroll y
 * respeta la barra de gestos (gotcha 14). Sin fechas, avisa y ofrece «Ver otros planes».
 */
export function BookingBar({
  plan,
  dates,
  selectedDate,
  onSelect,
  onBook,
  onSeeOtherPlans,
}: {
  plan: Plan;
  dates: readonly PlanDate[];
  /** Null solo cuando no hay fechas. */
  selectedDate: PlanDate | null;
  onSelect: (planDate: PlanDate) => void;
  onBook: (planDate: PlanDate) => void;
  onSeeOtherPlans: () => void;
}) {
  const theme = useTheme();
  const cs = theme.colorScheme;
  const insets = useSafeAreaInsets();
  const surface = { backgroundColor: theme.pageBackground, borderTopColor: withAlpha(cs.outlineVariant, 0.5) };

  if (selectedDate === null) {
    return (
      <View testID="booking-bar" style={[styles.surface, surface]}>
        <View style={[styles.noDates, { paddingBottom: 16 + insets.bottom }]}>
          <Icon name="event_busy_rounded" color={cs.onSurfaceVariant} />
          <View style={{ width: 10 }} />
          <Text style={{ flex: 1, fontWeight: '600' }}>Sin fechas disponibles por ahora</Text>
          {/* Se encoge: en celulares angostos o con letra grande parte su texto en vez de desbordar. */}
          <TextButton text="Ver otros planes" onPress={onSeeOtherPlans} style={styles.shrinkable} />
        </View>
      </View>
    );
  }

  // SafeArea(minimum: 20, 10, 20, 12): el mayor entre el inset del sistema y el mínimo.
  return (
    <View testID="booking-bar" style={[styles.surface, surface]}>
      <View
        style={{
          paddingLeft: Math.max(20, insets.left),
          paddingRight: Math.max(20, insets.right),
          paddingTop: 10,
          paddingBottom: Math.max(12, insets.bottom),
        }}
      >
        <ScrollView
          testID="booking-dates"
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ height: 62 }}
          contentContainerStyle={styles.dates}
        >
          {dates.map((f) => (
            <DateChip key={f.id} planDate={f} selected={f.id === selectedDate.id} onPress={() => onSelect(f)} />
          ))}
        </ScrollView>
        <View style={{ height: 10 }} />
        <View style={styles.row}>
          <View>
            <Text style={{ fontSize: AppText.headingL, fontWeight: '800', letterSpacing: -0.5, color: cs.onSurface }}>
              {formatCOP(plan.priceCop)}
            </Text>
            <Text style={{ fontSize: AppText.micro, color: cs.onSurfaceVariant }}>por persona · precio final</Text>
          </View>
          <View style={{ flex: 1 }} />
          <FilledButton icon="lock_outline_rounded" text="Reservar" onPress={() => onBook(selectedDate)} style={styles.book} />
        </View>
      </View>
    </View>
  );
}

/** Chip de una fecha con sus cupos; el cambio de selección se anima 160 ms easeOut. */
function DateChip({ planDate, selected, onPress }: { planDate: PlanDate; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
  const cs = theme.colorScheme;
  const t = useRef(new Animated.Value(selected ? 1 : 0)).current;
  useEffect(() => {
    const animation = Animated.timing(t, {
      toValue: selected ? 1 : 0,
      duration: Durations.dateChip,
      easing: Curves.easeOut.fn,
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [selected, t]);
  const isFewSpots = planDate.availableSpots <= FEW_SPOTS;
  const spotsText = isFewSpots ? `¡Últimos ${planDate.availableSpots}!` : `${planDate.availableSpots} cupos`;
  return (
    <Pressable
      testID={`date-${planDate.id}`}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${formatShortDate(planDate.date)}, ${spotsText}`}
      accessibilityState={{ selected }}
    >
      <Animated.View
        style={[
          styles.chip,
          { backgroundColor: t.interpolate({ inputRange: [0, 1], outputRange: [cs.surfaceContainerHigh, cs.primary] }) },
        ]}
      >
        <NoLineBreakText style={{ fontSize: AppText.detail, fontWeight: '700', color: selected ? cs.onPrimary : cs.onSurface }}>
          {formatShortDate(planDate.date)}
        </NoLineBreakText>
        <NoLineBreakText
          style={{
            fontSize: AppText.note,
            fontWeight: '600',
            color: selected ? withAlpha(cs.onPrimary, 0.8) : isFewSpots ? theme.diverso.fewSpots : cs.onSurfaceVariant,
          }}
        >
          {spotsText}
        </NoLineBreakText>
      </Animated.View>
    </Pressable>
  );
}

/** Lo que el texto visible puede pasarse del ancho medido (cae sobre el padding de 14 del chip). */
const SLACK = 8;

/**
 * Texto de una línea que no se corta aunque Android lo mida unos px más angosto de lo que lo dibuja
 * (pasaba con «jue, 26 nov»: partía «nov» a una segunda línea que el chip recortaba). Una copia
 * invisible y oculta a los lectores de pantalla da el ancho; la visible va encima en UNA línea, con
 * [SLACK] de más a la derecha. El tamaño no depende de la selección: solo cambia el color.
 */
function NoLineBreakText({ style, children }: { style: TextStyle; children: ReactNode }) {
  return (
    <View>
      <Text
        style={[style, styles.measure]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {children}
      </Text>
      <Text numberOfLines={1} style={[style, styles.visible]}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  surface: { borderTopWidth: 1 },
  noDates: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16 },
  shrinkable: { flexShrink: 1 },
  dates: { gap: 8, alignItems: 'stretch' },
  chip: { height: 62, justifyContent: 'center', paddingHorizontal: 14, borderRadius: AppRadii.field },
  measure: { opacity: 0 },
  visible: { position: 'absolute', left: 0, top: 0, right: -SLACK },
  row: { flexDirection: 'row', alignItems: 'center' },
  book: { minWidth: 150, minHeight: 52 },
});
