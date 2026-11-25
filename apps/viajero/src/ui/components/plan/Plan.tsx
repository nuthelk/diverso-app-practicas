import { StyleSheet, View } from 'react-native';

import { AppInsets, AppRadii, AppText, withAlpha, useTheme } from '@/ui/theme';

import { Icon } from '../Icon';
import { Text } from '../Text';

/**
 * Sello «Verificada RNT». [onPhoto] es la versión sobre foto (fondo `sealOverPhoto`, texto
 * blanco); normal: primary al 10 % con texto primary. Compacto: padding 7/2.5, texto 10.5,
 * ícono 13; normal: 10/5, 11, 15.
 */
export function VerifiedBadge({ compact = false, onPhoto = false }: { compact?: boolean; onPhoto?: boolean }) {
  const theme = useTheme();
  const cs = theme.colorScheme;
  const fg = onPhoto ? '#FFFFFF' : cs.primary;
  const bg = onPhoto ? theme.diverso.sealOverPhoto : withAlpha(cs.primary, 0.1);
  return (
    <View
      testID="verified-badge"
      style={[
        styles.pill,
        { backgroundColor: bg, paddingHorizontal: compact ? 7 : 10, paddingVertical: compact ? 2.5 : 5 },
      ]}
    >
      <Icon name="verified_rounded" size={compact ? 13 : 15} color={fg} />
      <View style={{ width: 4 }} />
      <Text style={{ fontSize: compact ? AppText.micro : AppText.note, fontWeight: '700', color: fg }}>
        Verificada RNT
      </Text>
    </View>
  );
}

/** Política de cancelación del plan, en una tarjeta tertiaryContainer al 45 %. */
export function CancellationCard({ text }: { text: string }) {
  const cs = useTheme().colorScheme;
  return (
    <View
      testID="tarjeta-cancelacion"
      style={[
        styles.row,
        AppInsets.card,
        { backgroundColor: withAlpha(cs.tertiaryContainer, 0.45), borderRadius: AppRadii.card, alignItems: 'flex-start' },
      ]}
    >
      <Icon name="shield_outlined" size={19} color={cs.onTertiaryContainer} />
      <View style={{ width: 10 }} />
      <View style={styles.flex}>
        <Text style={{ fontWeight: '700', fontSize: AppText.smallBody }}>Política de cancelación</Text>
        <View style={{ height: 3 }} />
        <Text height={1.45} style={{ fontSize: AppText.detail, color: withAlpha(cs.onSurface, 0.8) }}>
          {text}
        </Text>
      </View>
    </View>
  );
}

/** Lo que el paso necesita de `ItineraryStep` (core). */
export interface ItineraryStepData {
  time: string;
  activity: string;
}

/**
 * Un paso del itinerario: hora (62, a la derecha), punto + línea de tiempo y la actividad. La línea
 * baja hasta el punto del paso siguiente: el [isLast] no la dibuja (terminaría en el vacío).
 */
export function ItineraryStepRow({ step, isLast = false }: { step: ItineraryStepData; isLast?: boolean }) {
  const cs = useTheme().colorScheme;
  return (
    <View style={styles.row}>
      <Text
        height={1.35}
        style={{ width: 62, textAlign: 'right', fontWeight: '800', fontSize: AppText.detail, color: cs.primary }}
      >
        {step.time}
      </Text>
      <View style={{ width: 14 }} />
      <View style={styles.line}>
        <View style={[styles.dot, { backgroundColor: cs.primary }]} />
        {isLast ? null : (
          <View testID="linea-itinerario" style={[styles.flex, { width: 1.6, backgroundColor: cs.outlineVariant }]} />
        )}
      </View>
      <View style={{ width: 14 }} />
      <View style={[styles.flex, { paddingBottom: 16 }]}>
        <Text height={1.45} style={{ fontSize: AppText.body }}>
          {step.activity}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', borderRadius: AppRadii.pill },
  row: { flexDirection: 'row', alignItems: 'stretch' },
  flex: { flex: 1 },
  line: { alignItems: 'center' },
  dot: { marginTop: 4, width: 8, height: 8, borderRadius: 4 },
});
