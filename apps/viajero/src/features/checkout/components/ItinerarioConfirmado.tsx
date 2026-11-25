import { StyleSheet, View } from 'react-native';

import type { ItinerarioPaso } from '@/core';
import { Text } from '@/ui/components';
import { AppInsets, AppRadios, AppText, useTheme } from '@/ui/theme';

/** Cuántos pasos se muestran antes de remitir al resto en la app. */
export const MAX_PASOS = 5;

/** Itinerario inmediato de la confirmación (Anexo 6): los primeros pasos y cuántos más hay. */
export function ItinerarioConfirmado({ pasos }: { pasos: readonly ItinerarioPaso[] }) {
  const cs = useTheme().colorScheme;
  return (
    <View style={[AppInsets.tarjetaGrande, estilos.caja, { backgroundColor: cs.surfaceContainerLow }]}>
      <Text style={{ fontSize: AppText.micro, fontWeight: '700', letterSpacing: 1.6, color: cs.onSurfaceVariant }}>
        ITINERARIO
      </Text>
      <View style={{ height: 12 }} />
      {pasos.slice(0, MAX_PASOS).map((paso, i) => (
        <View key={`${i}-${paso.hora}`} style={estilos.paso}>
          <View style={estilos.hora}>
            <Text style={{ fontWeight: '800', fontSize: AppText.leyendaGrande, color: cs.primary }}>{paso.hora}</Text>
          </View>
          <Text altura={1.4} style={[estilos.flexible, { fontSize: AppText.detalle }]}>
            {paso.actividad}
          </Text>
        </View>
      ))}
      {pasos.length > MAX_PASOS ? (
        <Text style={{ fontSize: AppText.leyenda, color: cs.onSurfaceVariant }}>
          {`+ ${pasos.length - MAX_PASOS} pasos más en la app`}
        </Text>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  caja: { borderRadius: AppRadios.card },
  paso: { flexDirection: 'row', alignItems: 'flex-start', paddingBottom: 8 },
  hora: { width: 52 },
  flexible: { flex: 1, minWidth: 0 },
});
