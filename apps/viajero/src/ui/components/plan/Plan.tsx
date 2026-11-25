import { StyleSheet, View } from 'react-native';

import { AppInsets, AppRadios, AppText, conAlfa, useTheme } from '@/ui/theme';

import { Icono } from '../Icono';
import { Text } from '../Text';

/**
 * Sello «Verificada RNT». [blanco] es la versión sobre foto (fondo `selloSobreFoto`, texto
 * blanco); normal: primary al 10 % con texto primary. Compacto: padding 7/2.5, texto 10.5,
 * ícono 13; normal: 10/5, 11, 15.
 */
export function VerifiedBadge({ compacto = false, blanco = false }: { compacto?: boolean; blanco?: boolean }) {
  const tema = useTheme();
  const cs = tema.colorScheme;
  const fg = blanco ? '#FFFFFF' : cs.primary;
  const bg = blanco ? tema.diverso.selloSobreFoto : conAlfa(cs.primary, 0.1);
  return (
    <View
      testID="verified-badge"
      style={[
        estilos.pildora,
        { backgroundColor: bg, paddingHorizontal: compacto ? 7 : 10, paddingVertical: compacto ? 2.5 : 5 },
      ]}
    >
      <Icono nombre="verified_rounded" size={compacto ? 13 : 15} color={fg} />
      <View style={{ width: 4 }} />
      <Text style={{ fontSize: compacto ? AppText.micro : AppText.nota, fontWeight: '700', color: fg }}>
        Verificada RNT
      </Text>
    </View>
  );
}

/** Política de cancelación del plan, en una tarjeta tertiaryContainer al 45 %. */
export function TarjetaCancelacion({ texto }: { texto: string }) {
  const cs = useTheme().colorScheme;
  return (
    <View
      testID="tarjeta-cancelacion"
      style={[
        estilos.fila,
        AppInsets.tarjeta,
        { backgroundColor: conAlfa(cs.tertiaryContainer, 0.45), borderRadius: AppRadios.card, alignItems: 'flex-start' },
      ]}
    >
      <Icono nombre="shield_outlined" size={19} color={cs.onTertiaryContainer} />
      <View style={{ width: 10 }} />
      <View style={estilos.flex}>
        <Text style={{ fontWeight: '700', fontSize: AppText.cuerpoChico }}>Política de cancelación</Text>
        <View style={{ height: 3 }} />
        <Text altura={1.45} style={{ fontSize: AppText.detalle, color: conAlfa(cs.onSurface, 0.8) }}>
          {texto}
        </Text>
      </View>
    </View>
  );
}

/** Lo que el paso necesita de `ItinerarioPaso` (core). */
export interface PasoItinerarioDatos {
  time: string;
  activity: string;
}

/**
 * Un paso del itinerario: hora (62, a la derecha), punto + línea de tiempo y la actividad. La línea
 * baja hasta el punto del paso siguiente: el [ultimo] no la dibuja (terminaría en el vacío).
 */
export function PasoItinerario({ paso, ultimo = false }: { paso: PasoItinerarioDatos; ultimo?: boolean }) {
  const cs = useTheme().colorScheme;
  return (
    <View style={estilos.fila}>
      <Text
        altura={1.35}
        style={{ width: 62, textAlign: 'right', fontWeight: '800', fontSize: AppText.detalle, color: cs.primary }}
      >
        {paso.time}
      </Text>
      <View style={{ width: 14 }} />
      <View style={estilos.linea}>
        <View style={[estilos.punto, { backgroundColor: cs.primary }]} />
        {ultimo ? null : (
          <View testID="linea-itinerario" style={[estilos.flex, { width: 1.6, backgroundColor: cs.outlineVariant }]} />
        )}
      </View>
      <View style={{ width: 14 }} />
      <View style={[estilos.flex, { paddingBottom: 16 }]}>
        <Text altura={1.45} style={{ fontSize: AppText.cuerpo }}>
          {paso.activity}
        </Text>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  pildora: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', borderRadius: AppRadios.pill },
  fila: { flexDirection: 'row', alignItems: 'stretch' },
  flex: { flex: 1 },
  linea: { alignItems: 'center' },
  punto: { marginTop: 4, width: 8, height: 8, borderRadius: 4 },
});
