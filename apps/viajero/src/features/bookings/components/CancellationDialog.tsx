import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { noLineBreaks, type CancellationPreview } from '@/core';
import { FilledButton, Text, TextButton } from '@/ui/components';
import { useTheme } from '@/ui/theme';

import { cancellationPolicyText } from '../booking-format';

/**
 * Confirmación de cancelación (`CancelacionDialog`, un `AlertDialog` M3 de radio 28): muestra el
 * reembolso que daría la política ANTES de confirmar. [onResult] recibe `true` si el viajero
 * confirma y `false` si elige «Mantener» o cierra el diálogo (toque fuera o atrás de Android),
 * como `showDialog<bool>` que devuelve `null`.
 */
export function CancellationDialog({
  code,
  preview,
  onResult,
}: {
  code: string;
  preview: CancellationPreview;
  onResult: (confirmed: boolean) => void;
}) {
  const theme = useTheme();
  const cs = theme.colorScheme;
  return (
    <Modal transparent visible animationType="fade" onRequestClose={() => onResult(false)} statusBarTranslucent>
      <View style={styles.backdrop}>
        <Pressable
          accessibilityLabel="Cerrar"
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.54)' }]}
          onPress={() => onResult(false)}
        />
        <View
          accessibilityViewIsModal
          style={[styles.dialog, { backgroundColor: cs.surfaceContainerHigh, borderRadius: theme.components.dialog.radius }]}
        >
          <Text accessibilityRole="header" style={{ fontSize: 24, color: cs.onSurface, letterSpacing: 0 }} height={1.33}>
            ¿Cancelar reserva?
          </Text>
          <View style={{ height: 16 }} />
          <Text style={{ color: cs.onSurfaceVariant }}>
            {`La reserva ${code} se cancelará y los cupos volverán a estar disponibles.`}
          </Text>
          <View style={{ height: 12 }} />
          <Text style={{ fontWeight: '600', color: preview.applies ? cs.primary : cs.error }}>
            {noLineBreaks(cancellationPolicyText(preview))}
          </Text>
          <View style={{ height: 24 }} />
          <View style={styles.actions}>
            <TextButton text="Mantener" onPress={() => onResult(false)} />
            <FilledButton variant="tonal" accessibilityLabel="Sí, cancelar" onPress={() => onResult(true)}>
              <Text style={{ color: cs.error }}>Sí, cancelar</Text>
            </FilledButton>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  dialog: { width: '100%', maxWidth: 560, minWidth: 280, padding: 24 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', columnGap: 8, rowGap: 8 },
});
