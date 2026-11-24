import { StyleSheet, View } from 'react-native';

import { Text } from '@/ui/components';
import { AppRadios, AppText, conAlfa, useTheme } from '@/ui/theme';

/** Tarjeta con el código de la reserva, seleccionable para copiarlo (`SelectableText`). */
export function CodigoReserva({ codigo }: { codigo: string }) {
  const cs = useTheme().colorScheme;
  return (
    <View style={[estilos.caja, { backgroundColor: cs.primaryContainer }]}>
      <Text
        style={{
          fontSize: AppText.micro,
          fontWeight: '700',
          letterSpacing: 1.6,
          color: conAlfa(cs.onPrimaryContainer, 0.75),
        }}
      >
        CÓDIGO DE RESERVA
      </Text>
      <View style={{ height: 6 }} />
      <Text
        selectable
        style={{ fontSize: AppText.cifra, fontWeight: '900', letterSpacing: 3, color: cs.onPrimaryContainer }}
      >
        {codigo}
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  caja: { paddingVertical: 18, borderRadius: AppRadios.card, alignItems: 'center' },
});
