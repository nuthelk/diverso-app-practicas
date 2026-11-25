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

import { BarraReserva } from '../components/BarraReserva';
import { GaleriaPlan } from '../components/GaleriaPlan';
import { DetalleSkeleton, IncluyePill } from '../components/PiezasFicha';
import { ResenaItem } from '../components/ResenaItem';
import { TarjetaAgencia } from '../components/TarjetaAgencia';
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
  const tema = useTheme();
  const router = useRouter();
  const { catalogo, resenas } = useDependencies();
  const vm = usePlanDetailViewModel({ catalogo, resenas, planId });
  const { cargar } = vm;
  const volver = () => volverSeguro(router, AppRoutes.explorar);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  let cuerpo;
  if (vm.cargando) {
    cuerpo = <DetalleSkeleton />;
  } else if (vm.error !== null || vm.plan === null) {
    cuerpo = (
      <>
        {/* En Flutter el error no tenía cómo volver; abierta en frío dejaba al viajero atrapado. */}
        <TopBar title="" onBack={volver} />
        <EmptyState
          icon="cloud_off_rounded"
          title="No pudimos cargar el plan"
          message={vm.error ?? ''}
          action={<FilledButton variant="tonal" text="Reintentar" onPress={() => void vm.cargar()} />}
        />
      </>
    );
  } else {
    const plan = vm.plan;
    cuerpo = (
      <>
        <View testID="ficha-contenido" style={estilos.flex}>
          <CollapsibleHeader title={plan.title} expandedHeight={300} onBack={volver} background={<GaleriaPlan fotos={plan.photos} />}>
            <ContenidoFicha plan={plan} resenas={vm.resenas} />
          </CollapsibleHeader>
        </View>
        {/* Debajo del scroll, no encima: el contenido termina donde empieza la barra. */}
        <BarraReserva
          plan={plan}
          fechas={vm.fechas}
          seleccionada={vm.fechaSeleccionada}
          onSeleccionar={vm.seleccionarFecha}
          onReservar={(f) => router.push(AppRoutes.checkout(plan.id, f.id) as Href)}
          onVerOtros={volver}
        />
      </>
    );
  }

  return (
    <View testID="pantalla-PlanDetailView" style={[estilos.flex, { backgroundColor: tema.pageBackground }]}>
      {cuerpo}
    </View>
  );
}

/** Secciones de la ficha (todo lo que hace scroll bajo la cabecera). */
function ContenidoFicha({ plan, resenas }: { plan: Plan; resenas: readonly Review[] }) {
  const cs = useTheme().colorScheme;
  const incluyeAlgo = plan.includes.length > 0 || plan.includesTransport || plan.includesFood || plan.includesLodging;
  return (
    <View testID="ficha-columna" style={estilos.contenido}>
      <Text height={1.15} accessibilityRole="header" style={{ fontSize: AppText.heading3xl, fontWeight: '800', letterSpacing: -0.8 }}>
        {plan.title}
      </Text>
      <View style={{ height: 8 }} />
      <View style={estilos.fila}>
        <View style={estilos.encogible}>
          <PlanScore plan={plan} detailed />
        </View>
        <View style={estilos.flex} />
        <View style={[estilos.duracion, { backgroundColor: cs.secondaryContainer }]}>
          <Icon name="schedule_rounded" size={14} color={cs.onSecondaryContainer} />
          <Text style={{ marginLeft: 4, fontSize: AppText.caption, fontWeight: '700', color: cs.onSecondaryContainer }}>
            {plan.durationText}
          </Text>
        </View>
      </View>
      <View style={{ height: 18 }} />

      {plan.agency !== null ? <TarjetaAgencia agency={plan.agency} /> : null}
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

      {incluyeAlgo ? (
        <>
          <SectionLabel text="Qué incluye · precio final" />
          <View style={estilos.incluye}>
            {plan.includesTransport ? <IncluyePill icono="directions_bus_rounded" texto="Transporte" /> : null}
            {plan.includesFood ? <IncluyePill icono="restaurant_rounded" texto="Comida" /> : null}
            {plan.includesLodging ? <IncluyePill icono="hotel_rounded" texto="Hospedaje" /> : null}
            {plan.includes.map((i, n) => (
              <IncluyePill key={`${n}-${i}`} icono="check_circle_rounded" texto={i} textoLargo />
            ))}
          </View>
          <View style={{ height: 24 }} />
        </>
      ) : null}

      {plan.itinerary.length > 0 ? (
        <>
          <SectionLabel text="Itinerario" />
          {plan.itinerary.map((paso, i) => (
            <ItineraryStepRow key={`${i}-${paso.time}`} step={paso} isLast={i === plan.itinerary.length - 1} />
          ))}
          <View style={{ height: 24 }} />
        </>
      ) : null}

      {plan.meetingPoint !== '' ? (
        <>
          <SectionLabel text="Punto de encuentro" />
          <View style={estilos.fila}>
            <Icon name="flag_rounded" size={17} color={cs.primary} />
            <Text style={{ marginLeft: 8, flex: 1, fontSize: AppText.largeBody }}>{plan.meetingPoint}</Text>
          </View>
          <View style={{ height: 24 }} />
        </>
      ) : null}

      {plan.cancellationPolicy !== '' ? <CancellationCard text={plan.cancellationPolicy} /> : null}

      {resenas.length > 0 ? (
        <>
          <View style={{ height: 24 }} />
          <SectionLabel text={`Reseñas verificadas (${plan.reviewsCount})`} />
          {resenas.map((r) => (
            <ResenaItem key={r.id} review={r} />
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
const ANCHO_MAXIMO_FICHA = 720;

const estilos = StyleSheet.create({
  flex: { flex: 1 },
  encogible: { flexShrink: 1 },
  fila: { flexDirection: 'row', alignItems: 'center' },
  // En pantallas anchas (web) una columna de lectura centrada: sin esto las líneas cruzaban toda la
  // ventana. La foto de la cabecera sigue a todo el ancho; en el celular el tope no se nota.
  contenido: {
    width: '100%',
    maxWidth: ANCHO_MAXIMO_FICHA,
    alignSelf: 'center',
    paddingLeft: 22,
    paddingTop: 20,
    paddingRight: 22,
    paddingBottom: 24,
  },
  duracion: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: AppRadii.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  incluye: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
