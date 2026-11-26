import { Image } from 'expo-image';
import { useRouter, type Href } from 'expo-router';
import { memo, useState } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { EMOJI_EXPERIENCE_CATEGORY, type Plan } from '@/core';
import { AppRoutes } from '@/router';
import { Card, Icon, IconButton, PriceText, PlanScore, Text, VerifiedBadge } from '@/ui/components';
import { AppRadii, AppText, useTheme } from '@/ui/theme';

/** Alto de la portada de la tarjeta (y de su esqueleto). */
export const PLAN_COVER_HEIGHT = 168;

/**
 * Tarjeta de plan del catálogo (`plan_card.dart`): foto protagonista con degradado, destino y
 * duración sobre la imagen, cupos de la próxima salida, sello de agencia verificada, precio final
 * visible desde el inicio y botón de comparar. Toda la tarjeta abre `/plan/:id`.
 * [onToggleCompare] null oculta el botón de comparar (página de una agencia).
 *
 * `memo`: escribir en el buscador cambia el estado del catálogo y re-pinta la vista en cada tecla;
 * las tarjetas (props estables: el plan, un booleano y un callback de useCallback) no se repintan.
 * La vista no pasa por React Compiler (desiste ante try/finally), así que no lo haría solo.
 */
export const PlanCard = memo(function PlanCard({
  plan,
  isCompared = false,
  onToggleCompare,
}: {
  plan: Plan;
  isCompared?: boolean;
  onToggleCompare?: ((plan: Plan) => void) | null;
}) {
  const cs = useTheme().colorScheme;
  const router = useRouter();

  // El botón de comparar va como HERMANO de la tarjeta, superpuesto: en web un Pressable es un
  // <button> y un <button> dentro de otro es HTML inválido (y el teclado/lector no lo alcanza).
  // En Flutter el IconButton vivía dentro del InkWell; visualmente queda en el mismo lugar.
  // flexGrow: en la grilla la tarjeta llena la celda como en SliverGrid; en la lista no cambia nada.
  return (
    <View style={styles.wrapper}>
      <Card
        testID={`plan-card-${plan.id}`}
        color={cs.surfaceContainerLow}
        onPress={() => router.push(AppRoutes.plan(plan.id) as Href)}
        accessibilityLabel={plan.title}
        style={styles.wrapper}
      >
        <PlanCardContent plan={plan} />
      </Card>
      {onToggleCompare ? (
        <View style={styles.compare}>
          <IconButton
            icon={isCompared ? 'check_rounded' : 'compare_arrows_rounded'}
            iconSize={19}
            tooltip={isCompared ? 'Quitar del comparador' : 'Agregar al comparador'}
            backgroundColor={isCompared ? cs.primary : 'rgba(0, 0, 0, 0.28)'}
            iconColor={isCompared ? cs.onPrimary : '#FFFFFF'}
            style={styles.compact}
            onPress={() => onToggleCompare(plan)}
          />
        </View>
      ) : null}
    </View>
  );
});

function PlanCardContent({ plan }: { plan: Plan }) {
  const cs = useTheme().colorScheme;
  const nextDate = plan.availableDates[0];
  return (
    <>
      <View style={{ height: PLAN_COVER_HEIGHT }}>
        <PlanCover plan={plan} />
        {/* Degradado negro 22 % → transparente (45 %) → 45 %, en dos tramos. */}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <View testID="cover-gradient" style={[styles.flex, COVER_GRADIENT]} />
        </View>
        {plan.agency?.isVerified === true ? (
          <View style={styles.seal}>
            <VerifiedBadge onPhoto compact />
          </View>
        ) : null}
        <View style={styles.destination}>
          <Icon name="location_on_rounded" size={14} color="#FFFFFF" />
          <View style={{ width: 3 }} />
          <Text numberOfLines={1} style={{ color: '#FFFFFF', fontWeight: '700', fontSize: AppText.detail, flexShrink: 1 }}>
            {plan.destination}
          </Text>
          <View style={{ width: 8 }} />
          {/* Oscura translúcida (no blanca): el texto blanco se lee igual sobre un cielo o una pared clara. */}
          <View
            testID="duration-pill"
            style={[styles.pill, { backgroundColor: 'rgba(0, 0, 0, 0.38)', paddingHorizontal: 7, paddingVertical: 2 }]}
          >
            <Text style={{ color: '#FFFFFF', fontSize: AppText.note, fontWeight: '600' }}>{plan.durationText}</Text>
          </View>
        </View>
        {nextDate ? (
          <View style={[styles.spots, styles.pill, { backgroundColor: '#FFFFFF' }]}>
            <Icon name="event_available_rounded" size={12} color={cs.primary} />
            <View style={{ width: 3 }} />
            <Text style={{ fontSize: AppText.note, fontWeight: '700', color: cs.primary }}>
              {`${nextDate.availableSpots} cupos`}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={styles.content}>
        <Text
          numberOfLines={2}
          ellipsizeMode="tail"
          height={1.25}
          style={{ fontSize: AppText.largeEmphasis, fontWeight: '700', letterSpacing: -0.3 }}
        >
          {plan.title}
        </Text>
        <View style={{ height: 8 }} />
        <View style={styles.row}>
          <PlanScore plan={plan} />
          <View style={styles.flex} />
          <PriceText amount={plan.priceCop} />
        </View>
      </View>
    </>
  );
}

/** Foto de portada; sin foto (o si falla), el emoji de la categoría sobre primaryContainer. */
function PlanCover({ plan }: { plan: Plan }) {
  const cs = useTheme().colorScheme;
  const [failed, setFailed] = useState(false);
  const photo = plan.mainPhoto;
  if (photo === null || failed) {
    return (
      <View testID="cover-fallback" style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: cs.primaryContainer }]}>
        <Text style={{ fontSize: AppText.photoEmoji }}>{EMOJI_EXPERIENCE_CATEGORY[plan.category]}</Text>
      </View>
    );
  }
  return (
    <Image
      testID="cover-photo"
      source={{ uri: photo }}
      contentFit="cover"
      // Listas a 120 Hz: conserva el bitmap anterior entre cargas.
      recyclingKey={plan.id}
      style={StyleSheet.absoluteFill}
      onError={() => setFailed(true)}
      accessible={false}
    />
  );
}

const GRADIENT_CSS = 'linear-gradient(to bottom, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.45) 100%)';

/**
 * `LinearGradient` de Flutter con `backgroundImage` (estable en React Native; la misma propiedad
 * sirve en web). No hace falta una dependencia de degradados.
 */
const COVER_GRADIENT: ViewStyle = { backgroundImage: GRADIENT_CSS };

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrapper: { flexGrow: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  seal: { position: 'absolute', top: 10, left: 10 },
  compare: { position: 'absolute', top: 6, right: 6 },
  // VisualDensity.compact: 40 - 8.
  compact: { width: 32, height: 32, borderRadius: 16 },
  destination: { position: 'absolute', left: 12, bottom: 10, right: 96, flexDirection: 'row', alignItems: 'center' },
  spots: { position: 'absolute', right: 12, bottom: 10, paddingHorizontal: 8, paddingVertical: 3 },
  pill: { borderRadius: AppRadii.pill, flexDirection: 'row', alignItems: 'center' },
  content: { paddingLeft: 14, paddingTop: 12, paddingRight: 14, paddingBottom: 14 },
});
