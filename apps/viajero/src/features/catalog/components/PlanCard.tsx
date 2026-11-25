import { Image } from 'expo-image';
import { useRouter, type Href } from 'expo-router';
import { memo, useState } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { EMOJI_EXPERIENCE_CATEGORY, type Plan } from '@/core';
import { AppRoutes } from '@/router';
import { Card, Icono, IconButton, PriceText, PuntajePlan, Text, VerifiedBadge } from '@/ui/components';
import { AppRadios, AppText, useTheme } from '@/ui/theme';

/** Alto de la portada de la tarjeta (y de su esqueleto). */
export const ALTO_PORTADA_PLAN = 168;

/**
 * Tarjeta de plan del catálogo (`plan_card.dart`): foto protagonista con degradado, destino y
 * duración sobre la imagen, cupos de la próxima salida, sello de agencia verificada, precio final
 * visible desde el inicio y botón de comparar. Toda la tarjeta abre `/plan/:id`.
 * [onToggleComparar] null oculta el botón de comparar (página de una agencia).
 *
 * `memo`: escribir en el buscador cambia el estado del catálogo y re-pinta la vista en cada tecla;
 * las tarjetas (props estables: el plan, un booleano y un callback de useCallback) no se repintan.
 * La vista no pasa por React Compiler (desiste ante try/finally), así que no lo haría solo.
 */
export const PlanCard = memo(function PlanCard({
  plan,
  comparada = false,
  onToggleComparar,
}: {
  plan: Plan;
  comparada?: boolean;
  onToggleComparar?: ((plan: Plan) => void) | null;
}) {
  const cs = useTheme().colorScheme;
  const router = useRouter();

  // El botón de comparar va como HERMANO de la tarjeta, superpuesto: en web un Pressable es un
  // <button> y un <button> dentro de otro es HTML inválido (y el teclado/lector no lo alcanza).
  // En Flutter el IconButton vivía dentro del InkWell; visualmente queda en el mismo lugar.
  // flexGrow: en la grilla la tarjeta llena la celda como en SliverGrid; en la lista no cambia nada.
  return (
    <View style={estilos.envoltura}>
      <Card
        testID={`plan-card-${plan.id}`}
        color={cs.surfaceContainerLow}
        onPress={() => router.push(AppRoutes.plan(plan.id) as Href)}
        accessibilityLabel={plan.titulo}
        style={estilos.envoltura}
      >
        <ContenidoPlanCard plan={plan} />
      </Card>
      {onToggleComparar ? (
        <View style={estilos.comparar}>
          <IconButton
            icono={comparada ? 'check_rounded' : 'compare_arrows_rounded'}
            tamanoIcono={19}
            tooltip={comparada ? 'Quitar del comparador' : 'Agregar al comparador'}
            colorFondo={comparada ? cs.primary : 'rgba(0, 0, 0, 0.28)'}
            colorIcono={comparada ? cs.onPrimary : '#FFFFFF'}
            style={estilos.compacto}
            onPress={() => onToggleComparar(plan)}
          />
        </View>
      ) : null}
    </View>
  );
});

function ContenidoPlanCard({ plan }: { plan: Plan }) {
  const cs = useTheme().colorScheme;
  const proxima = plan.fechasDisponibles[0];
  return (
    <>
      <View style={{ height: ALTO_PORTADA_PLAN }}>
        <PortadaPlan plan={plan} />
        {/* Degradado negro 22 % → transparente (45 %) → 45 %, en dos tramos. */}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <View testID="degradado-portada" style={[estilos.flex, DEGRADADO_PORTADA]} />
        </View>
        {plan.agency?.verificada === true ? (
          <View style={estilos.sello}>
            <VerifiedBadge blanco compacto />
          </View>
        ) : null}
        <View style={estilos.destino}>
          <Icono nombre="location_on_rounded" size={14} color="#FFFFFF" />
          <View style={{ width: 3 }} />
          <Text numberOfLines={1} style={{ color: '#FFFFFF', fontWeight: '700', fontSize: AppText.detalle, flexShrink: 1 }}>
            {plan.destino}
          </Text>
          <View style={{ width: 8 }} />
          <View style={[estilos.pildora, { backgroundColor: 'rgba(255, 255, 255, 0.22)', paddingHorizontal: 7, paddingVertical: 2 }]}>
            <Text style={{ color: '#FFFFFF', fontSize: AppText.nota, fontWeight: '600' }}>{plan.duracionTexto}</Text>
          </View>
        </View>
        {proxima ? (
          <View style={[estilos.cupos, estilos.pildora, { backgroundColor: '#FFFFFF' }]}>
            <Icono nombre="event_available_rounded" size={12} color={cs.primary} />
            <View style={{ width: 3 }} />
            <Text style={{ fontSize: AppText.nota, fontWeight: '700', color: cs.primary }}>
              {`${proxima.cupoDisponible} cupos`}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={estilos.contenido}>
        <Text
          numberOfLines={2}
          ellipsizeMode="tail"
          altura={1.25}
          style={{ fontSize: AppText.enfasisGrande, fontWeight: '700', letterSpacing: -0.3 }}
        >
          {plan.titulo}
        </Text>
        <View style={{ height: 8 }} />
        <View style={estilos.fila}>
          <PuntajePlan plan={plan} />
          <View style={estilos.flex} />
          <PriceText monto={plan.precioCop} />
        </View>
      </View>
    </>
  );
}

/** Foto de portada; sin foto (o si falla), el emoji de la categoría sobre primaryContainer. */
function PortadaPlan({ plan }: { plan: Plan }) {
  const cs = useTheme().colorScheme;
  const [fallo, setFallo] = useState(false);
  const foto = plan.fotoPrincipal;
  if (foto === null || fallo) {
    return (
      <View testID="portada-respaldo" style={[StyleSheet.absoluteFill, estilos.centro, { backgroundColor: cs.primaryContainer }]}>
        <Text style={{ fontSize: AppText.emojiFoto }}>{EMOJI_EXPERIENCE_CATEGORY[plan.categoria]}</Text>
      </View>
    );
  }
  return (
    <Image
      testID="portada-foto"
      source={{ uri: foto }}
      contentFit="cover"
      // Listas a 120 Hz: conserva el bitmap anterior entre cargas.
      recyclingKey={plan.id}
      style={StyleSheet.absoluteFill}
      onError={() => setFallo(true)}
      accessible={false}
    />
  );
}

const CSS_DEGRADADO = 'linear-gradient(to bottom, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.45) 100%)';

/**
 * `LinearGradient` de Flutter con `backgroundImage` (estable en React Native; la misma propiedad
 * sirve en web). No hace falta una dependencia de degradados.
 */
const DEGRADADO_PORTADA: ViewStyle = { backgroundImage: CSS_DEGRADADO };

const estilos = StyleSheet.create({
  flex: { flex: 1 },
  envoltura: { flexGrow: 1 },
  centro: { alignItems: 'center', justifyContent: 'center' },
  fila: { flexDirection: 'row', alignItems: 'center' },
  sello: { position: 'absolute', top: 10, left: 10 },
  comparar: { position: 'absolute', top: 6, right: 6 },
  // VisualDensity.compact: 40 - 8.
  compacto: { width: 32, height: 32, borderRadius: 16 },
  destino: { position: 'absolute', left: 12, bottom: 10, right: 96, flexDirection: 'row', alignItems: 'center' },
  cupos: { position: 'absolute', right: 12, bottom: 10, paddingHorizontal: 8, paddingVertical: 3 },
  pildora: { borderRadius: AppRadios.pill, flexDirection: 'row', alignItems: 'center' },
  contenido: { paddingLeft: 14, paddingTop: 12, paddingRight: 14, paddingBottom: 14 },
});
