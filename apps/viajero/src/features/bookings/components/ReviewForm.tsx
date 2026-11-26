import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { formatLongDate } from '@/core';
import { FilledButton, Icon, Text, TextField } from '@/ui/components';
import { AppInsets, AppText, withAlpha, Durations, useTheme } from '@/ui/theme';

import { MAX_STARS, type ReviewViewModel } from '../view-models/useReviewViewModel';

const LABELS: Record<number, string> = { 1: 'Muy mala', 2: 'Mala', 3: 'Regular', 4: 'Buena' };
const labelFor = (rating: number) => LABELS[rating] ?? '¡Excelente!';

/**
 * Formulario de la reseña verificada (el `ReviewView` de Flutter): título del plan y fecha,
 * cinco estrellas (42, «N de 5 estrellas»), la etiqueta de la calificación con un fundido de
 * 150 ms, el comentario opcional (5 líneas, máx. 500 con contador) y «Publicar reseña». Mientras
 * envía —o ya publicada— todo queda bloqueado y el botón muestra un indicador.
 */
export function ReviewForm({ vm, onSubmit }: { vm: ReviewViewModel; onSubmit: (comment: string) => void }) {
  const theme = useTheme();
  const cs = theme.colorScheme;
  const [comment, setComment] = useState('');
  const plan = vm.booking?.plan ?? null;
  const date = vm.booking?.planDate?.date ?? null;
  const locked = vm.submitting || vm.published;
  const disabledButtonColor = withAlpha(cs.onSurface, 0.38);

  return (
    // Ni iOS ni Android (edge-to-edge desde el SDK 58) achican la ventana con el teclado: sin
    // `padding` en AMBAS taparía el comentario y «Publicar reseña». En web no hace nada.
    <KeyboardAvoidingView testID="resena-teclado" style={styles.flex} behavior="padding">
      <ScrollView contentContainerStyle={[AppInsets.screen, styles.center]} keyboardShouldPersistTaps="handled">
        <View style={styles.column}>
          {plan !== null ? (
            <>
              <Text
                height={1.2}
                style={{ fontSize: AppText.headingM, fontWeight: '800', letterSpacing: -0.5, textAlign: 'center' }}
              >
                {plan.title}
              </Text>
              {date !== null ? (
                <>
                  <View style={{ height: 4 }} />
                  <Text style={{ fontSize: AppText.detail, color: cs.onSurfaceVariant, textAlign: 'center' }}>
                    {formatLongDate(date)}
                  </Text>
                </>
              ) : null}
            </>
          ) : null}
          <View style={{ height: 30 }} />
          <Text style={{ fontSize: AppText.subtitle, fontWeight: '700', color: cs.onSurface, textAlign: 'center' }}>
            ¿Cómo estuvo tu experiencia?
          </Text>
          <View style={{ height: 18 }} />
          <View style={styles.stars}>
            {Array.from({ length: MAX_STARS }, (_, i) => {
              const filled = i < vm.rating;
              return (
                <Pressable
                  key={i}
                  accessibilityRole="button"
                  accessibilityLabel={`${i + 1} de 5 estrellas`}
                  accessibilityState={{ disabled: locked, selected: filled }}
                  disabled={locked}
                  onPress={() => vm.rate(i + 1)}
                  style={styles.star}
                >
                  <Icon
                    name={filled ? 'star_rounded' : 'star_outline_rounded'}
                    size={42}
                    color={filled ? theme.diverso.gold : cs.outline}
                  />
                </Pressable>
              );
            })}
          </View>
          <RatingLabel text={labelFor(vm.rating)} color={cs.primary} />
          <View style={{ height: 28 }} />
          <TextField
            value={comment}
            onChangeText={setComment}
            label="Cuenta cómo te fue (opcional)"
            lines={5}
            maxLength={500}
            disabled={locked}
          />
          <View style={{ height: 18 }} />
          <FilledButton
            accessibilityLabel="Publicar reseña"
            onPress={locked ? null : () => onSubmit(comment)}
            style={{ paddingLeft: 16 }}
          >
            {locked ? (
              <View style={styles.indicator}>
                <ActivityIndicator size="small" color={disabledButtonColor} style={{ transform: [{ scale: 0.85 }] }} />
              </View>
            ) : (
              <Icon name="send_rounded" size={17} color={cs.onPrimary} />
            )}
            <Text>Publicar reseña</Text>
          </FilledButton>
          <View style={{ height: 14 }} />
          <View style={styles.footer}>
            <Icon name="verified_rounded" size={13} color={cs.tertiary} />
            <View style={{ width: 5 }} />
            <Text style={[styles.shrink, { fontSize: AppText.caption, color: cs.onSurfaceVariant }]}>
              Reseña verificada: solo quien viajó puede opinar
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** `AnimatedSwitcher(150 ms)`: cada etiqueta nueva entra con un fundido. */
function RatingLabel({ text, color }: { text: string; color: string }) {
  const opacity = useRef(new Animated.Value(1)).current;
  const previous = useRef(text);
  useEffect(() => {
    if (previous.current === text) return;
    previous.current = text;
    opacity.setValue(0);
    const animation = Animated.timing(opacity, {
      toValue: 1,
      duration: Durations.starsLabel,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [text, opacity]);
  return (
    <Animated.View style={[styles.label, { opacity }]}>
      <Text style={{ color, fontWeight: '700', fontSize: AppText.emphasis }}>{text}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  column: { width: '100%', maxWidth: 460, alignItems: 'stretch' },
  stars: { flexDirection: 'row', justifyContent: 'center' },
  star: { paddingHorizontal: 6, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  label: { alignItems: 'center' },
  indicator: { width: 17, height: 17, alignItems: 'center', justifyContent: 'center' },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  shrink: { flexShrink: 1 },
});
