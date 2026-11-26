import { StyleSheet, View } from 'react-native';

import { Text } from '@/ui/components';
import { AppRadii, AppText, withAlpha, useTheme } from '@/ui/theme';

/** Tarjeta con el código de la reserva, seleccionable para copiarlo (`SelectableText`). */
export function BookingCode({ code }: { code: string }) {
  const cs = useTheme().colorScheme;
  return (
    <View style={[styles.box, { backgroundColor: cs.primaryContainer }]}>
      <Text
        style={{
          fontSize: AppText.micro,
          fontWeight: '700',
          letterSpacing: 1.6,
          color: withAlpha(cs.onPrimaryContainer, 0.75),
        }}
      >
        CÓDIGO DE RESERVA
      </Text>
      <View style={{ height: 6 }} />
      <Text
        selectable
        style={{ fontSize: AppText.figure, fontWeight: '900', letterSpacing: 3, color: cs.onPrimaryContainer }}
      >
        {code}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { paddingVertical: 18, borderRadius: AppRadii.card, alignItems: 'center' },
});
