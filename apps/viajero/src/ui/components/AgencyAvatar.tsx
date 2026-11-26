import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { DiversoColors } from '@/ui/theme';

import { Text } from './Text';

/**
 * FNV-1a de 32 bits sobre las *code units* UTF-16 (igual que `String.codeUnits` de Dart).
 * `Math.imul` + `>>> 0` reproducen `(h * 0x01000193) & 0xFFFFFFFF` sin perder precisión.
 */
export function hashFnv1a(key: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h = Math.imul(h ^ key.charCodeAt(i), 0x01000193) >>> 0;
  }
  return h;
}

/** Color estable de una agencia (`colorDeAgencia` de agency_avatar.dart). */
export function agencyColor(key: string): string {
  const palette = DiversoColors.agencyPalette;
  return palette[hashFnv1a(key) % palette.length];
}

/** Lo que el avatar necesita de `AgencySummary` (core). */
export interface AgencyAvatarData {
  id: string;
  initials: string;
  logoUrl?: string | null;
}

/**
 * Logo de la agencia; sin logo (o si falla la carga), sus iniciales blancas w800 (size × .38,
 * ls .5) sobre `agencyColor(id)`.
 */
export function AgencyAvatar({ agency, size = 46 }: { agency: AgencyAvatarData; size?: number }) {
  const [failed, setFailed] = useState(false);
  const logo = agency.logoUrl;
  const hasLogo = !!logo && !failed;
  return (
    <View testID="agency-avatar" style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }]}>
      {hasLogo ? (
        <Image
          testID="agency-avatar-logo"
          source={{ uri: logo }}
          contentFit="cover"
          style={StyleSheet.absoluteFill}
          onError={() => setFailed(true)}
          accessible={false}
        />
      ) : (
        <View
          testID="agency-avatar-initials"
          style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: agencyColor(agency.id) }]}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: size * 0.38, letterSpacing: 0.5 }}>
            {agency.initials}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { overflow: 'hidden' },
  center: { alignItems: 'center', justifyContent: 'center' },
});
