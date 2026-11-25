import { useRouter, type Href } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { useDependencies } from '@/composition';
import type { Plan, Review } from '@/core';
import { TopBar } from '@/features/shell/components/TopBar';
import { AppRoutes, volverSeguro } from '@/router';
import {
  CollapsibleHeader,
  EmptyState,
  FilledButton,
  Icon,
  ItineraryStepRow,
  PlanScore,
  SectionLabel,
  CancellationCard,
  Text,
} from '@/ui/components';
import { AppRadii, AppText, withAlpha, useTheme } from '@/ui/theme';

import { BookingBar } from '../components/BookingBar';
import { PlanGallery } from '../components/PlanGallery';
import { PlanDetailSkeleton, IncludesPill } from '../components/PlanDetailParts';
import { ReviewItem } from '../components/ReviewItem';
import { PlanAgencyCard } from '../components/PlanAgencyCard';
import { usePlanDetailViewModel } from '../view-models/usePlanDetailViewModel';

export interface PlanDetailViewProps {
  planId: string;
}

/**
 * Ficha del plan (`/plan/:id`, `plan_detail_view.dart`): galería, agencia, qué incluye,
 * itinerario, punto de encuentro, cancelación, reseñas y barra de reserva DEBAJO del scroll.
 * «Volver» y «Ver otros planes» usan `volverSeguro` (en Flutter hacían `pop` sin comprobar: abierta
 * en frío no había a dónde volver; gotcha 6, se corrige).
 */
export function PlanDetailView({ planId }: PlanDetailViewProps) {
  const theme = useTheme();
  const router = useRouter();
  const { catalogo: catalog, resenas: reviews } = useDependencies();
  const vm = usePlanDetailViewModel({ catalog, reviews, planId });
  const { load } = vm;
  const goBack = () => volverSeguro(router, AppRoutes.explorar);

  useEffect(() => {
    void load();
  }, [load]);

  let body;
  if (vm.loading) {
    body = <PlanDetailSkeleton />;
  } else if (vm.error !== null || vm.plan === null) {
    body = (
      <>
        {/* En Flutter el error no tenía cómo volver; abierta en frío dejaba al viajero atrapado. */}
        <TopBar title="" onBack={goBack} />
        <EmptyState
          icon="cloud_off_rounded"
          title="No pudimos cargar el plan"
          message={vm.error ?? ''}
          action={<FilledButton variant="tonal" text="Reintentar" onPress={() => void vm.load()} />}
        />
      </>
    );
  } else {
    const plan = vm.plan;
    body = (
      <>
        <View testID="ficha-contenido" style={styles.flex}>
          <CollapsibleHeader title={plan.title} expandedHeight={300} onBack={goBack} background={<PlanGallery photos={plan.photos} />}>
            <PlanDetailContent plan={plan} reviews={vm.reviews} />
          </CollapsibleHeader>
        </View>
        {/* Debajo del scroll, no encima: el contenido termina donde empieza la barra. */}
        <BookingBar
          plan={plan}
          dates={vm.dates}
          selectedDate={vm.selectedDate}
          onSelect={vm.selectDate}
          onBook={(f) => router.push(AppRoutes.checkout(plan.id, f.id) as Href)}
          onSeeOtherPlans={goBack}
        />
      </>
    );
  }

  return (
    <View testID="pantalla-PlanDetailView" style={[styles.flex, { backgroundColor: theme.pageBackground }]}>
      {body}
    </View>
  );
}

/** Secciones de la ficha (todo lo que hace scroll bajo la cabecera). */
function PlanDetailContent({ plan, reviews }: { plan: Plan; reviews: readonly Review[] }) {
  const cs = useTheme().colorScheme;
  const includesAnything = plan.includes.length > 0 || plan.includesTransport || plan.includesFood || plan.includesLodging;
  return (
    <View testID="ficha-columna" style={styles.content}>
      <Text height={1.15} accessibilityRole="header" style={{ fontSize: AppText.heading3xl, fontWeight: '800', letterSpacing: -0.8 }}>
        {plan.title}
      </Text>
      <View style={{ height: 8 }} />
      <View style={styles.row}>
        <View style={styles.shrinkable}>
          <PlanScore plan={plan} detailed />
        </View>
        <View style={styles.flex} />
        <View style={[styles.duration, { backgroundColor: cs.secondaryContainer }]}>
          <Icon name="schedule_rounded" size={14} color={cs.onSecondaryContainer} />
          <Text style={{ marginLeft: 4, fontSize: AppText.caption, fontWeight: '700', color: cs.onSecondaryContainer }}>
            {plan.durationText}
          </Text>
        </View>
      </View>
      <View style={{ height: 18 }} />

      {plan.agency !== null ? <PlanAgencyCard agency={plan.agency} /> : null}
      <View style={{ height: 24 }} />

      {plan.description !== '' ? (
        <>
          <SectionLabel text="La experiencia" />
          <Text height={1.55} style={{ fontSize: AppText.largeBody, color: withAlpha(cs.onSurface, 0.85) }}>
            {plan.description}
          </Text>
          <View style={{ height: 24 }} />
        </>
      ) : null}

      {includesAnything ? (
        <>
          <SectionLabel text="Qué incluye · precio final" />
          <View style={styles.includes}>
            {plan.includesTransport ? <IncludesPill icon="directions_bus_rounded" text="Transporte" /> : null}
            {plan.includesFood ? <IncludesPill icon="restaurant_rounded" text="Comida" /> : null}
            {plan.includesLodging ? <IncludesPill icon="hotel_rounded" text="Hospedaje" /> : null}
            {plan.includes.map((i, n) => (
              <IncludesPill key={`${n}-${i}`} icon="check_circle_rounded" text={i} isLongText />
            ))}
          </View>
          <View style={{ height: 24 }} />
        </>
      ) : null}

      {plan.itinerary.length > 0 ? (
        <>
          <SectionLabel text="Itinerario" />
          {plan.itinerary.map((step, i) => (
            <ItineraryStepRow key={`${i}-${step.time}`} step={step} isLast={i === plan.itinerary.length - 1} />
          ))}
          <View style={{ height: 24 }} />
        </>
      ) : null}

      {plan.meetingPoint !== '' ? (
        <>
          <SectionLabel text="Punto de encuentro" />
          <View style={styles.row}>
            <Icon name="flag_rounded" size={17} color={cs.primary} />
            <Text style={{ marginLeft: 8, flex: 1, fontSize: AppText.largeBody }}>{plan.meetingPoint}</Text>
          </View>
          <View style={{ height: 24 }} />
        </>
      ) : null}

      {plan.cancellationPolicy !== '' ? <CancellationCard text={plan.cancellationPolicy} /> : null}

      {reviews.length > 0 ? (
        <>
          <View style={{ height: 24 }} />
          <SectionLabel text={`Reseñas verificadas (${plan.reviewsCount})`} />
          {reviews.map((r) => (
            <ReviewItem key={r.id} review={r} />
          ))}
        </>
      ) : plan.reviewsCount > 0 ? (
        <>
          <View style={{ height: 24 }} />
          <SectionLabel text={`Reseñas verificadas (${plan.reviewsCount})`} />
          <Text style={{ color: cs.onSurfaceVariant, fontSize: AppText.detail }}>Carga al volver a abrir…</Text>
        </>
      ) : null}
    </View>
  );
}

/** Ancho máximo de la columna de texto de la ficha (lectura cómoda en web). */
const MAX_CONTENT_WIDTH = 720;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  shrinkable: { flexShrink: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  // En pantallas anchas (web) una columna de lectura centrada: sin esto las líneas cruzaban toda la
  // ventana. La foto de la cabecera sigue a todo el ancho; en el celular el tope no se nota.
  content: {
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
    paddingLeft: 22,
    paddingTop: 20,
    paddingRight: 22,
    paddingBottom: 24,
  },
  duration: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: AppRadii.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  includes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
