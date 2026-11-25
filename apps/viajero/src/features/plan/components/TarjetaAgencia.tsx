import { useRouter, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AgenciaResumen, formatFechaTexto, type Agency } from '@/core';
import { AppRoutes } from '@/router';
import { AgencyAvatar, Icono, Text, VerifiedBadge } from '@/ui/components';
import { AppInsets, AppRadios, AppText, conAlfa, useTheme } from '@/ui/theme';

/**
 * Agencia del plan (`tarjeta_agencia.dart`, confianza): mismo avatar que la lista de agencias,
 * nombre, RNT y su vigencia, sello DEBAJO del texto (en celulares angostos a su lado le robaba el
 * ancho al nombre). Abre la página de la agencia.
 */
export function TarjetaAgencia({ agency }: { agency: Agency }) {
  const tema = useTheme();
  const cs = tema.colorScheme;
  const router = useRouter();
  const resumen = new AgenciaResumen({ id: agency.id, nombre: agency.nombre, ciudad: agency.ciudad, logoUrl: agency.logoUrl });
  return (
    <Pressable
      testID="tarjeta-agencia"
      accessibilityRole="button"
      accessibilityLabel={agency.nombre}
      onPress={() => router.push(AppRoutes.agencia(agency.id) as Href)}
      style={({ pressed }) => [
        estilos.caja,
        AppInsets.tarjeta,
        { backgroundColor: cs.surfaceContainerLow },
        pressed ? { backgroundColor: conAlfa(cs.onSurface, 0.1) } : null,
      ]}
    >
      <AgencyAvatar agencia={resumen} size={44} />
      <View style={{ width: 12 }} />
      <View testID="tarjeta-agencia-textos" style={estilos.flex}>
        <Text style={{ fontWeight: '700', fontSize: AppText.enfasis }}>{agency.nombre}</Text>
        <View style={{ height: 2 }} />
        <Text style={{ fontSize: AppText.leyendaGrande, color: cs.onSurfaceVariant }}>{`Agencia local · RNT ${agency.numeroRnt}`}</Text>
        {agency.rntVigenteHasta !== null ? (
          <Text style={{ fontSize: AppText.leyenda, color: cs.onSurfaceVariant }}>
            {`RNT vigente hasta el ${formatFechaTexto(agency.rntVigenteHasta)}`}
          </Text>
        ) : null}
        {agency.verificada ? (
          <View testID="sello-agencia" style={estilos.sello}>
            <VerifiedBadge />
          </View>
        ) : null}
      </View>
      <Icono nombre="chevron_right_rounded" color={cs.onSurfaceVariant} />
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  caja: { flexDirection: 'row', alignItems: 'center', borderRadius: AppRadios.card, overflow: 'hidden' },
  flex: { flex: 1 },
  // FittedBox(scaleDown): con letra grande se achica en vez de desbordar.
  sello: { marginTop: 6, alignSelf: 'flex-start', maxWidth: '100%' },
});
