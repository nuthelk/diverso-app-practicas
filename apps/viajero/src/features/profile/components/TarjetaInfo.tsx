import { StyleSheet, View } from 'react-native';

import { Icon, Text, type IconName } from '@/ui/components';
import { AppInsets, AppRadii, AppText, useTheme } from '@/ui/theme';

/**
 * Tarjeta informativa del perfil (`TarjetaInfo`): ícono en un círculo primaryContainer, título y
 * texto (compra protegida, tus datos).
 */
export function TarjetaInfo({ icono, titulo, cuerpo }: { icono: IconName; titulo: string; cuerpo: string }) {
  const cs = useTheme().colorScheme;
  return (
    <View style={[estilos.fila, AppInsets.wideCard, { backgroundColor: cs.surfaceContainerLow, borderRadius: AppRadii.card }]}>
      <View style={[estilos.circulo, { backgroundColor: cs.primaryContainer }]}>
        <Icon name={icono} size={17} color={cs.onPrimaryContainer} />
      </View>
      <View style={{ width: 13 }} />
      <View style={estilos.flex}>
        <Text style={{ fontWeight: '700', fontSize: AppText.body }}>{titulo}</Text>
        <View style={{ height: 4 }} />
        <Text height={1.5} style={{ fontSize: AppText.detail, color: cs.onSurfaceVariant }}>
          {cuerpo}
        </Text>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'flex-start' },
  circulo: { padding: 9, borderRadius: 999 },
  flex: { flex: 1 },
});
