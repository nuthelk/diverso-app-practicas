import { StyleSheet, View } from 'react-native';

import { Icon, Text } from '@/ui/components';
import { AppInsets, AppRadii, AppText, useTheme } from '@/ui/theme';

/** Caja de error del checkout con el mensaje del view model. */
export function PaymentErrorNotice({ message }: { message: string }) {
  const cs = useTheme().colorScheme;
  return (
    <View
      accessibilityRole="alert"
      style={[AppInsets.card, styles.box, { backgroundColor: cs.errorContainer }]}
    >
      <Icon name="error_outline_rounded" color={cs.onErrorContainer} />
      <View style={{ width: 10 }} />
      <Text style={[styles.text, { color: cs.onErrorContainer, fontSize: AppText.smallBody }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center', borderRadius: AppRadii.card },
  text: { flex: 1, minWidth: 0 },
});
