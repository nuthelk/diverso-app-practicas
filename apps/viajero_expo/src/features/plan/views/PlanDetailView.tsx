import { useRouter, type Href } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { useDependencies } from '@/composition';
import type { Plan, Review } from '@/core';
import { BarraSuperior } from '@/features/shell/components/BarraSuperior';
import { AppRoutes, volverSeguro } from '@/router';
import {
  CabeceraColapsable,
  EmptyState,
  FilledButton,
  Icono,
  PasoItinerario,
  PuntajePlan,
  SectionLabel,
  TarjetaCancelacion,
  Text,
} from '@/ui/components';
import { AppRadios, AppText, conAlfa, useTheme } from '@/ui/theme';

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
        <BarraSuperior titulo="" onVolver={volver} />
        <EmptyState
          icono="cloud_off_rounded"
          titulo="No pudimos cargar el plan"
          mensaje={vm.error ?? ''}
          accion={<FilledButton variante="tonal" texto="Reintentar" onPress={() => void vm.cargar()} />}
        />
      </>
    );
  } else {
    const plan = vm.plan;
    cuerpo = (
      <>
        <View testID="ficha-contenido" style={estilos.flex}>
          <CabeceraColapsable titulo={plan.titulo} alturaExpandida={300} onVolver={volver} fondo={<GaleriaPlan fotos={plan.fotos} />}>
            <ContenidoFicha plan={plan} resenas={vm.resenas} />
          </CabeceraColapsable>
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
    <View testID="pantalla-PlanDetailView" style={[estilos.flex, { backgroundColor: tema.fondoPagina }]}>
      {cuerpo}
    </View>
  );
}

/** Secciones de la ficha (todo lo que hace scroll bajo la cabecera). */
function ContenidoFicha({ plan, resenas }: { plan: Plan; resenas: readonly Review[] }) {
  const cs = useTheme().colorScheme;
  const incluyeAlgo = plan.incluye.length > 0 || plan.incluyeTransporte || plan.incluyeComida || plan.incluyeHospedaje;
  return (
    <View style={estilos.contenido}>
      <Text altura={1.15} accessibilityRole="header" style={{ fontSize: AppText.encabezado3xl, fontWeight: '800', letterSpacing: -0.8 }}>
        {plan.titulo}
      </Text>
      <View style={{ height: 8 }} />
      <View style={estilos.fila}>
        <View style={estilos.encogible}>
          <PuntajePlan plan={plan} detallado />
        </View>
        <View style={estilos.flex} />
        <View style={[estilos.duracion, { backgroundColor: cs.secondaryContainer }]}>
          <Icono nombre="schedule_rounded" size={14} color={cs.onSecondaryContainer} />
          <Text style={{ marginLeft: 4, fontSize: AppText.leyenda, fontWeight: '700', color: cs.onSecondaryContainer }}>
            {plan.duracionTexto}
          </Text>
        </View>
      </View>
      <View style={{ height: 18 }} />

      {plan.agency !== null ? <TarjetaAgencia agency={plan.agency} /> : null}
      <View style={{ height: 24 }} />

      {plan.descripcion !== '' ? (
        <>
          <SectionLabel texto="La experiencia" />
          <Text altura={1.55} style={{ fontSize: AppText.cuerpoGrande, color: conAlfa(cs.onSurface, 0.85) }}>
            {plan.descripcion}
          </Text>
          <View style={{ height: 24 }} />
        </>
      ) : null}

      {incluyeAlgo ? (
        <>
          <SectionLabel texto="Qué incluye · precio final" />
          <View style={estilos.incluye}>
            {plan.incluyeTransporte ? <IncluyePill icono="directions_bus_rounded" texto="Transporte" /> : null}
            {plan.incluyeComida ? <IncluyePill icono="restaurant_rounded" texto="Comida" /> : null}
            {plan.incluyeHospedaje ? <IncluyePill icono="hotel_rounded" texto="Hospedaje" /> : null}
            {plan.incluye.map((i, n) => (
              <IncluyePill key={`${n}-${i}`} icono="check_circle_rounded" texto={i} textoLargo />
            ))}
          </View>
          <View style={{ height: 24 }} />
        </>
      ) : null}

      {plan.itinerario.length > 0 ? (
        <>
          <SectionLabel texto="Itinerario" />
          {plan.itinerario.map((paso, i) => (
            <PasoItinerario key={`${i}-${paso.hora}`} paso={paso} />
          ))}
          <View style={{ height: 24 }} />
        </>
      ) : null}

      {plan.puntoEncuentro !== '' ? (
        <>
          <SectionLabel texto="Punto de encuentro" />
          <View style={estilos.fila}>
            <Icono nombre="flag_rounded" size={17} color={cs.primary} />
            <Text style={{ marginLeft: 8, flex: 1, fontSize: AppText.cuerpoGrande }}>{plan.puntoEncuentro}</Text>
          </View>
          <View style={{ height: 24 }} />
        </>
      ) : null}

      {plan.politicaCancelacion !== '' ? <TarjetaCancelacion texto={plan.politicaCancelacion} /> : null}

      {resenas.length > 0 ? (
        <>
          <View style={{ height: 24 }} />
          <SectionLabel texto={`Reseñas verificadas (${plan.reviewsCount})`} />
          {resenas.map((r) => (
            <ResenaItem key={r.id} review={r} />
          ))}
        </>
      ) : plan.reviewsCount > 0 ? (
        <>
          <View style={{ height: 24 }} />
          <SectionLabel texto={`Reseñas verificadas (${plan.reviewsCount})`} />
          <Text style={{ color: cs.onSurfaceVariant, fontSize: AppText.detalle }}>Carga al volver a abrir…</Text>
        </>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  flex: { flex: 1 },
  encogible: { flexShrink: 1 },
  fila: { flexDirection: 'row', alignItems: 'center' },
  contenido: { paddingLeft: 22, paddingTop: 20, paddingRight: 22, paddingBottom: 24 },
  duracion: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: AppRadios.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  incluye: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
