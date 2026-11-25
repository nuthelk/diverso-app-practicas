import { Image } from 'expo-image';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { AgenciaResumen } from '@/core';
import { AppRoutes } from '@/router';
import { AgencyAvatar, Card, colorDeAgencia, Icono, InsigniaNueva, Text, VerifiedBadge } from '@/ui/components';
import { AppText, conAlfa, useTheme } from '@/ui/theme';

/**
 * Tarjeta de agencia de la lista (`agencia_card.dart`): portada, logo (o iniciales), nombre,
 * puntaje («Nueva» sin reseñas), ciudad, número de planes y sello. Abre `/agencia/:id`.
 */
export function AgenciaCard({ agencia }: { agencia: AgenciaResumen }) {
  const cs = useTheme().colorScheme;
  const router = useRouter();
  return (
    <Card
      testID={`agencia-card-${agencia.id}`}
      color={cs.surfaceContainerLow}
      accessibilityLabel={agencia.nombre}
      onPress={() => router.push(AppRoutes.agencia(agencia.id) as Href)}
    >
      <View style={{ height: 128 }}>
        <PortadaAgencia agencia={agencia} />
        <View style={estilos.sello}>
          <VerifiedBadge blanco compacto />
        </View>
      </View>
      <View style={estilos.pie}>
        <AgencyAvatar agencia={agencia} />
        <View style={{ width: 12 }} />
        <View style={estilos.flex}>
          <Text numberOfLines={1} ellipsizeMode="tail" style={{ fontSize: AppText.enfasisGrande, fontWeight: '700', letterSpacing: -0.3 }}>
            {agencia.nombre}
          </Text>
          <View style={{ height: 5 }} />
          <DatosAgencia agencia={agencia} />
        </View>
      </View>
    </Card>
  );
}

/** Puntaje (★ 4.5 (2) o «Nueva»), ciudad y «N planes» en una línea que se parte si no cabe. */
export function DatosAgencia({ agencia }: { agencia: AgenciaResumen }) {
  const tema = useTheme();
  const cs = tema.colorScheme;
  const suave = { fontSize: AppText.leyendaGrande, color: cs.onSurfaceVariant };
  return (
    <View style={estilos.datos}>
      {agencia.esNueva ? (
        <InsigniaNueva texto={agencia.puntajeTexto} />
      ) : (
        <View style={estilos.fila}>
          <Icono nombre="star_rounded" size={17} color={tema.diverso.dorado} />
          <Text style={{ marginLeft: 2, fontSize: AppText.detalle, fontWeight: '700', color: cs.onSurface }}>{agencia.puntajeTexto}</Text>
          <Text style={[suave, { marginLeft: 3 }]}>{`(${agencia.reviewsTotal})`}</Text>
        </View>
      )}
      {agencia.ciudad !== '' ? (
        <View style={estilos.fila}>
          <Icono nombre="location_on_outlined" size={14} color={cs.onSurfaceVariant} />
          <Text style={[suave, { marginLeft: 2 }]}>{agencia.ciudad}</Text>
        </View>
      ) : null}
      <Text style={suave}>{agencia.planesTexto}</Text>
    </View>
  );
}

/** Portada: la foto del plan mejor puntuado; sin foto (o si falla), el color de la agencia. */
export function PortadaAgencia({ agencia }: { agencia: AgenciaResumen }) {
  const [fallo, setFallo] = useState(false);
  const color = colorDeAgencia(agencia.id);
  const url = agencia.portadaUrl;
  if (!url || fallo) {
    return (
      <View testID="portada-agencia-respaldo" style={[StyleSheet.absoluteFill, estilos.centro, { backgroundColor: conAlfa(color, 0.16) }]}>
        <Icono nombre="storefront_rounded" size={40} color={conAlfa(color, 0.55)} />
      </View>
    );
  }
  return (
    <Image
      testID="portada-agencia-foto"
      source={{ uri: url }}
      contentFit="cover"
      style={StyleSheet.absoluteFill}
      onError={() => setFallo(true)}
      accessible={false}
    />
  );
}

const estilos = StyleSheet.create({
  flex: { flex: 1 },
  centro: { alignItems: 'center', justifyContent: 'center' },
  fila: { flexDirection: 'row', alignItems: 'center' },
  sello: { position: 'absolute', top: 10, left: 10 },
  pie: { flexDirection: 'row', alignItems: 'center', paddingLeft: 14, paddingTop: 12, paddingRight: 14, paddingBottom: 14 },
  datos: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 10, rowGap: 3 },
});
