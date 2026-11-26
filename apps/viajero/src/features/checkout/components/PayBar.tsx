import { useEffect, useState } from 'react';
import { ActivityIndicator, Keyboard, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatCOP } from '@/core';
import { FilledButton, Icon, Text } from '@/ui/components';
import { AppText, withAlpha, useTheme } from '@/ui/theme';

const BUTTON_WIDTH = 220;

/**
 * Alto del teclado (`MediaQuery.viewInsetsOf(context).bottom`). Ni iOS ni Android (edge-to-edge
 * desde el SDK 58: la ventana ya NO se achica) le hacen lugar solos; en web no hay teclado del
 * sistema. iOS avisa ANTES (`keyboardWill*`); Android solo emite `keyboardDid*`.
 */
function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;
    const ios = Platform.OS === 'ios';
    const showListener = Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', (e) =>
      setHeight(e.endCoordinates.height),
    );
    const hideListener = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', () => setHeight(0));
    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);
  return height;
}

/**
 * Barra inferior del checkout: total, personas y el botón «Pagar con Wompi». [onPay] null =
 * botón bloqueado; [processing] muestra el progreso. Va DEBAJO del scroll (no encima), así el
 * contenido termina donde empieza la barra; abajo suma el teclado o la barra de gestos.
 */
export function PayBar({
  total,
  pax,
  processing,
  onPay,
}: {
  total: number;
  pax: number;
  processing: boolean;
  onPay: (() => void) | null;
}) {
  const theme = useTheme();
  const cs = theme.colorScheme;
  const keyboard = useKeyboardHeight();
  const gestureInset = useSafeAreaInsets().bottom;
  const enabled = onPay !== null;
  const contentColor = enabled ? cs.onPrimary : withAlpha(cs.onSurface, 0.38);
  return (
    <View
      testID="pay-bar"
      style={[
        styles.bar,
        {
          paddingBottom: 14 + Math.max(keyboard, gestureInset),
          backgroundColor: theme.pageBackground,
          borderTopColor: withAlpha(cs.outlineVariant, 0.5),
        },
      ]}
    >
      <View style={styles.total}>
        <Text style={{ fontSize: AppText.headingM, fontWeight: '800', letterSpacing: -0.5, color: cs.onSurface }}>
          {formatCOP(total)}
        </Text>
        <Text style={{ fontSize: AppText.note, color: cs.onSurfaceVariant }}>
          {`total por ${pax} ${pax === 1 ? 'persona' : 'personas'}`}
        </Text>
      </View>
      {/* `FilledButton.icon` (16 | ícono 17 | 8 | texto | 24): candado o progreso. */}
      <FilledButton
        accessibilityLabel={processing ? 'Procesando…' : 'Pagar con Wompi'}
        onPress={onPay}
        style={styles.button}
      >
        {processing ? (
          // `SizedBox(17×17)` con un indicador de trazo 2 (el «small» de RN mide 20).
          <View style={styles.box17}>
            <ActivityIndicator testID="pay-progress" size="small" color={contentColor} style={styles.indicator} />
          </View>
        ) : (
          <Icon name="lock_rounded" size={17} color={contentColor} />
        )}
        <Text style={styles.centered}>{processing ? 'Procesando…' : 'Pagar con Wompi'}</Text>
      </FilledButton>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 20,
    paddingTop: 12,
    paddingRight: 20,
    borderTopWidth: 1,
  },
  total: { flex: 1, minWidth: 0 },
  button: { width: BUTTON_WIDTH, paddingLeft: 16, paddingRight: 24 },
  centered: { textAlign: 'center' },
  box17: { width: 17, height: 17, alignItems: 'center', justifyContent: 'center' },
  indicator: { transform: [{ scale: 0.85 }] },
});
