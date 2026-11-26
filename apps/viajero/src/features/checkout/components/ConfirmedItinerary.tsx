import { StyleSheet, View } from 'react-native';

import type { ItineraryStep } from '@/core';
import { Text } from '@/ui/components';
import { AppInsets, AppRadii, AppText, useTheme } from '@/ui/theme';

/** Cuántos pasos se muestran antes de remitir al resto en la app. */
export const MAX_STEPS = 5;

/** Itinerario inmediato de la confirmación (Anexo 6): los primeros pasos y cuántos más hay. */
export function ConfirmedItinerary({ steps }: { steps: readonly ItineraryStep[] }) {
  const cs = useTheme().colorScheme;
  return (
    <View style={[AppInsets.largeCard, styles.box, { backgroundColor: cs.surfaceContainerLow }]}>
      <Text style={{ fontSize: AppText.micro, fontWeight: '700', letterSpacing: 1.6, color: cs.onSurfaceVariant }}>
        ITINERARIO
      </Text>
      <View style={{ height: 12 }} />
      {steps.slice(0, MAX_STEPS).map((step, i) => (
        <View key={`${i}-${step.time}`} style={styles.step}>
          <View style={styles.time}>
            <Text style={{ fontWeight: '800', fontSize: AppText.largeCaption, color: cs.primary }}>{step.time}</Text>
          </View>
          <Text height={1.4} style={[styles.flexible, { fontSize: AppText.detail }]}>
            {step.activity}
          </Text>
        </View>
      ))}
      {steps.length > MAX_STEPS ? (
        <Text style={{ fontSize: AppText.caption, color: cs.onSurfaceVariant }}>
          {`+ ${steps.length - MAX_STEPS} pasos más en la app`}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: AppRadii.card },
  step: { flexDirection: 'row', alignItems: 'flex-start', paddingBottom: 8 },
  time: { width: 52 },
  flexible: { flex: 1, minWidth: 0 },
});
