import { StyleSheet, View } from 'react-native';

import type { ItineraryStep } from '@/core';
import { Text } from '@/ui/components';
import { AppInsets, AppRadii, AppText, useTheme } from '@/ui/theme';

/** Cuántos pasos se muestran antes de remitir al resto en la app. */
export const MAX_PASOS = 5;

/** Itinerario inmediato de la confirmación (Anexo 6): los primeros pasos y cuántos más hay. */
export function ItinerarioConfirmado({ pasos }: { pasos: readonly ItineraryStep[] }) {
  const cs = useTheme().colorScheme;
  return (
    <View style={[AppInsets.largeCard, estilos.caja, { backgroundColor: cs.surfaceContainerLow }]}>
      <Text style={{ fontSize: AppText.micro, fontWeight: '700', letterSpacing: 1.6, color: cs.onSurfaceVariant }}>
        ITINERARIO
      </Text>
      <View style={{ height: 12 }} />
      {pasos.slice(0, MAX_PASOS).map((paso, i) => (
        <View key={`${i}-${paso.time}`} style={estilos.paso}>
          <View style={estilos.hora}>
            <Text style={{ fontWeight: '800', fontSize: AppText.largeCaption, color: cs.primary }}>{paso.time}</Text>
          </View>
          <Text height={1.4} style={[estilos.flexible, { fontSize: AppText.detail }]}>
            {paso.activity}
          </Text>
        </View>
      ))}
      {pasos.length > MAX_PASOS ? (
        <Text style={{ fontSize: AppText.caption, color: cs.onSurfaceVariant }}>
          {`+ ${pasos.length - MAX_PASOS} pasos más en la app`}
        </Text>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  caja: { borderRadius: AppRadii.card },
  paso: { flexDirection: 'row', alignItems: 'flex-start', paddingBottom: 8 },
  hora: { width: 52 },
  flexible: { flex: 1, minWidth: 0 },
});
