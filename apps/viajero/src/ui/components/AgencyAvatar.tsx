import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { DiversoColors } from '@/ui/theme';

import { Text } from './Text';

/**
 * FNV-1a de 32 bits sobre las *code units* UTF-16 (igual que `String.codeUnits` de Dart).
 * `Math.imul` + `>>> 0` reproducen `(h * 0x01000193) & 0xFFFFFFFF` sin perder precisión.
 */
export function hashFnv1a(clave: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < clave.length; i++) {
    h = Math.imul(h ^ clave.charCodeAt(i), 0x01000193) >>> 0;
  }
  return h;
}

/** Color estable de una agencia (`colorDeAgencia` de agency_avatar.dart). */
export function colorDeAgencia(clave: string): string {
  const paleta = DiversoColors.paletaAgencias;
  return paleta[hashFnv1a(clave) % paleta.length];
}

/** Lo que el avatar necesita de `AgenciaResumen` (core). */
export interface AgenciaAvatarDatos {
  id: string;
  initials: string;
  logoUrl?: string | null;
}

/**
 * Logo de la agencia; sin logo (o si falla la carga), sus iniciales blancas w800 (size × .38,
 * ls .5) sobre `colorDeAgencia(id)`.
 */
export function AgencyAvatar({ agencia, size = 46 }: { agencia: AgenciaAvatarDatos; size?: number }) {
  const [fallo, setFallo] = useState(false);
  const logo = agencia.logoUrl;
  const conLogo = !!logo && !fallo;
  return (
    <View testID="agency-avatar" style={[estilos.circulo, { width: size, height: size, borderRadius: size / 2 }]}>
      {conLogo ? (
        <Image
          testID="agency-avatar-logo"
          source={{ uri: logo }}
          contentFit="cover"
          style={StyleSheet.absoluteFill}
          onError={() => setFallo(true)}
          accessible={false}
        />
      ) : (
        <View
          testID="agency-avatar-iniciales"
          style={[StyleSheet.absoluteFill, estilos.centro, { backgroundColor: colorDeAgencia(agencia.id) }]}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: size * 0.38, letterSpacing: 0.5 }}>
            {agencia.initials}
          </Text>
        </View>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  circulo: { overflow: 'hidden' },
  centro: { alignItems: 'center', justifyContent: 'center' },
});
