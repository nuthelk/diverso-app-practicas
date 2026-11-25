import { StyleSheet, View } from 'react-native';

import { Icono, Text } from '@/ui/components';
import { AppInsets, AppRadii, AppText, useTheme } from '@/ui/theme';

/** Caja de error del checkout con el mensaje del view model. */
export function AvisoErrorPago({ mensaje }: { mensaje: string }) {
  const cs = useTheme().colorScheme;
  return (
    <View
      accessibilityRole="alert"
      style={[AppInsets.card, estilos.caja, { backgroundColor: cs.errorContainer }]}
    >
      <Icono nombre="error_outline_rounded" color={cs.onErrorContainer} />
      <View style={{ width: 10 }} />
      <Text style={[estilos.texto, { color: cs.onErrorContainer, fontSize: AppText.smallBody }]}>{mensaje}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  caja: { flexDirection: 'row', alignItems: 'center', borderRadius: AppRadii.card },
  texto: { flex: 1, minWidth: 0 },
});
