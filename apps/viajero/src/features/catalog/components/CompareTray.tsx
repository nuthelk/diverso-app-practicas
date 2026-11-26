import { Image } from 'expo-image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { EMOJI_EXPERIENCE_CATEGORY, type Plan } from '@/core';
import { FilledButton, Icon, IconButton, Text, TextButton } from '@/ui/components';
import { AppRadii, AppText, withAlpha, Curves, Durations, Shadows, useTheme } from '@/ui/theme';

/** Desde cuántos planes se puede comparar. */
export const MIN_COMPARE = 2;

const THUMBNAIL_HEIGHT = 52;

interface CompareTrayProps {
  selection: readonly Plan[];
  max: number;
  onRemove: (plan: Plan) => void;
  onClear: () => void;
  onCompare: () => void;
}

/**
 * Bandeja de comparación con su animación (`AnimatedSwitcher` 220 ms: entra easeOutCubic, sale
 * easeInCubic, crece desde arriba + fundido). Sin selección no hay bandeja. Va DEBAJO de la lista
 * (no flota encima): la lista termina donde empieza la bandeja (gotcha 14).
 */
export function AnimatedCompareTray(props: CompareTrayProps) {
  const hasSelection = props.selection.length > 0;
  const t = useRef(new Animated.Value(hasSelection ? 1 : 0)).current;
  // Mientras sale se sigue pintando la última selección.
  const lastProps = useRef(props);
  if (hasSelection) lastProps.current = props;
  // Montada mientras haya selección o dure la salida. Se enciende EN EL RENDER (estado derivado de
  // las props) y se apaga recién al terminar la salida: así la salida no re-renderiza la bandeja a
  // mitad de camino. Con un setState al empezar la salida, en el dispositivo la animación terminaba
  // con finished=false y la bandeja quedaba congelada con la selección vieja (en Jest no pasa).
  const [mounted, setMounted] = useState(hasSelection);
  if (hasSelection && !mounted) setMounted(true);
  const [measuredHeight, setMeasuredHeight] = useState(0);
  const animatedHeight = useMemo(() => (measuredHeight > 0 ? t.interpolate({ inputRange: [0, 1], outputRange: [0, measuredHeight] }) : undefined), [measuredHeight, t]);
  const hadSelection = useRef(hasSelection);

  useEffect(() => {
    if (hadSelection.current === hasSelection) return;
    hadSelection.current = hasSelection;
    const animation = Animated.timing(t, {
      toValue: hasSelection ? 1 : 0,
      duration: Durations.compareTray,
      easing: (hasSelection ? Curves.easeOutCubic : Curves.easeInCubic).fn,
      useNativeDriver: false,
    });
    animation.start(({ finished }) => {
      if (finished && !hasSelection) setMounted(false);
    });
    return () => animation.stop();
  }, [hasSelection, t]);

  if (!mounted) return null;
  return (
    <Animated.View
      style={{
        opacity: t,
        // SizeTransition desde arriba: el alto crece de 0 al de la bandeja.
        height: animatedHeight,
        overflow: 'hidden',
      }}
    >
      <View onLayout={(e) => setMeasuredHeight(e.nativeEvent.layout.height)}>
        <CompareTray {...lastProps.current} />
      </View>
    </Animated.View>
  );
}

/**
 * Bandeja de comparación (`bandeja_comparar.dart`): contador, pista, «Limpiar», una miniatura por
 * plan elegido (foto + título, con ✕), lugares libres y «Comparar (n)», habilitado desde 2.
 */
export function CompareTray({ selection, max, onRemove, onClear, onCompare }: CompareTrayProps) {
  const theme = useTheme();
  const cs = theme.colorScheme;
  const n = selection.length;
  const canCompare = n >= MIN_COMPARE;
  const hint = !canCompare ? `Elige al menos ${MIN_COMPARE} planes` : n >= max ? `Máximo ${max} planes` : null;

  return (
    <View
      testID="compare-tray"
      style={[
        styles.tray,
        Shadows.tray,
        {
          backgroundColor: cs.surfaceContainerLowest,
          // Borde sutil además de la sombra: en oscuro la sombra casi no se ve.
          borderColor: withAlpha(cs.outlineVariant, 0.6),
          // Sin inset inferior: la barra de pestañas va debajo y ya consume el de la barra de gestos.
          paddingBottom: 14,
        },
      ]}
    >
      <View style={styles.row}>
        <View style={styles.flex}>
          <Text style={{ fontSize: AppText.emphasis, fontWeight: '800', letterSpacing: -0.2 }}>{`${n} de ${max} planes`}</Text>
          {hint ? <Text style={{ fontSize: AppText.largeCaption, color: cs.onSurfaceVariant }}>{hint}</Text> : null}
        </View>
        <TextButton text="Limpiar" onPress={onClear} />
      </View>
      <View style={{ height: 8 }} />
      <View style={styles.row}>
        <View style={[styles.flex, styles.row, { alignItems: 'flex-start' }]}>
          {Array.from({ length: max }, (_, i) => {
            const plan = selection[i];
            return (
              <View key={plan ? plan.id : `empty-slot-${i}`} style={[styles.flex, i > 0 ? { marginLeft: 8 } : null]}>
                {plan ? <Thumbnail plan={plan} onRemove={() => onRemove(plan)} /> : <EmptySlot />}
              </View>
            );
          })}
        </View>
        <View style={{ width: 12 }} />
        <FilledButton text={`Comparar (${n})`} onPress={canCompare ? onCompare : null} testID="compare-button" />
      </View>
    </View>
  );
}

/** Foto del plan con su ✕ y el título corto debajo. */
function Thumbnail({ plan, onRemove }: { plan: Plan; onRemove: () => void }) {
  const theme = useTheme();
  const cs = theme.colorScheme;
  const [failed, setFailed] = useState(false);
  const photo = plan.mainPhoto;
  return (
    <View>
      <View testID="thumbnail-photo" style={[styles.thumbnail, { height: THUMBNAIL_HEIGHT }]}>
        {photo === null || failed ? (
          <View style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: cs.primaryContainer }]}>
            <Text style={{ fontSize: AppText.headingS }}>{EMOJI_EXPERIENCE_CATEGORY[plan.category]}</Text>
          </View>
        ) : (
          <Image source={{ uri: photo }} contentFit="cover" style={StyleSheet.absoluteFill} onError={() => setFailed(true)} accessible={false} />
        )}
        <View style={styles.remove}>
          <IconButton
            variant="filled"
            icon="close_rounded"
            iconSize={14}
            tooltip={`Quitar ${plan.title} de la comparación`}
            backgroundColor={theme.diverso.controlOverPhoto}
            iconColor="#FFFFFF"
            style={styles.removeButton}
            onPress={onRemove}
          />
        </View>
      </View>
      <View style={{ height: 4 }} />
      <Text numberOfLines={1} height={1.2} style={{ fontSize: AppText.label, fontWeight: '600' }}>
        {plan.title}
      </Text>
    </View>
  );
}

/** Lugar libre (deja ver cuántos caben): del tamaño de una miniatura y decorativo. */
function EmptySlot() {
  const cs = useTheme().colorScheme;
  return (
    <View testID="empty-slot" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View
        testID="empty-slot-box"
        style={[
          styles.thumbnail,
          styles.center,
          {
            height: THUMBNAIL_HEIGHT,
            backgroundColor: withAlpha(cs.surfaceContainerHigh, 0.4),
            borderWidth: 1,
            borderColor: cs.outlineVariant,
          },
        ]}
      >
        <Icon name="add_rounded" size={20} color={cs.outline} />
      </View>
      <View style={{ height: 4 + 14 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  tray: {
    borderTopLeftRadius: AppRadii.card,
    borderTopRightRadius: AppRadii.card,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: 10,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  thumbnail: { borderRadius: AppRadii.control, overflow: 'hidden' },
  remove: { position: 'absolute', top: 2, right: 2 },
  removeButton: { width: 24, height: 24, borderRadius: 12 },
});
