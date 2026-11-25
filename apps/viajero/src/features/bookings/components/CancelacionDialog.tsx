import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { sinCortes, type CancellationPreview } from '@/core';
import { FilledButton, Text, TextButton } from '@/ui/components';
import { useTheme } from '@/ui/theme';

import { textoPoliticaCancelacion } from '../reserva-formato';

/**
 * Confirmación de cancelación (`CancelacionDialog`, un `AlertDialog` M3 de radio 28): muestra el
 * reembolso que daría la política ANTES de confirmar. [onResultado] recibe `true` si el viajero
 * confirma y `false` si elige «Mantener» o cierra el diálogo (toque fuera o atrás de Android),
 * como `showDialog<bool>` que devuelve `null`.
 */
export function CancelacionDialog({
  codigo,
  vista,
  onResultado,
}: {
  codigo: string;
  vista: CancellationPreview;
  onResultado: (confirmo: boolean) => void;
}) {
  const tema = useTheme();
  const cs = tema.colorScheme;
  return (
    <Modal transparent visible animationType="fade" onRequestClose={() => onResultado(false)} statusBarTranslucent>
      <View style={estilos.fondo}>
        <Pressable
          accessibilityLabel="Cerrar"
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.54)' }]}
          onPress={() => onResultado(false)}
        />
        <View
          accessibilityViewIsModal
          style={[estilos.dialogo, { backgroundColor: cs.surfaceContainerHigh, borderRadius: tema.componentes.dialog.radio }]}
        >
          <Text accessibilityRole="header" style={{ fontSize: 24, color: cs.onSurface, letterSpacing: 0 }} altura={1.33}>
            ¿Cancelar reserva?
          </Text>
          <View style={{ height: 16 }} />
          <Text style={{ color: cs.onSurfaceVariant }}>
            {`La reserva ${codigo} se cancelará y los cupos volverán a estar disponibles.`}
          </Text>
          <View style={{ height: 12 }} />
          <Text style={{ fontWeight: '600', color: vista.applies ? cs.primary : cs.error }}>
            {sinCortes(textoPoliticaCancelacion(vista))}
          </Text>
          <View style={{ height: 24 }} />
          <View style={estilos.acciones}>
            <TextButton texto="Mantener" onPress={() => onResultado(false)} />
            <FilledButton variante="tonal" accessibilityLabel="Sí, cancelar" onPress={() => onResultado(true)}>
              <Text style={{ color: cs.error }}>Sí, cancelar</Text>
            </FilledButton>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  fondo: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  dialogo: { width: '100%', maxWidth: 560, minWidth: 280, padding: 24 },
  acciones: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', columnGap: 8, rowGap: 8 },
});
