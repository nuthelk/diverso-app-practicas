import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { IconButton, Text } from '@/ui/components';
import { AppRadii, useTheme } from '@/ui/theme';

import { FiltersSheet, type FiltersSheetModel } from './FiltersSheet';

/**
 * Botón junto al buscador que abre la hoja de filtros (`boton_filtros.dart`); la insignia cuenta
 * los filtros activos (oculta en 0). El fondo es el relleno de los campos del tema, el mismo del
 * buscador de al lado. En Flutter era negro al 5 % fijo y en oscuro el botón no se veía (gotcha 19).
 */
export function FiltersButton({ vm }: { vm: FiltersSheetModel & { activeFilterCount: number } }) {
  const theme = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  return (
    <View>
      <IconButton
        variant="filledTonal"
        icon="tune_rounded"
        tooltip="Filtros y orden"
        backgroundColor={theme.components.input.fillColor}
        iconColor={theme.colorScheme.onSurface}
        style={styles.button}
        onPress={() => setIsOpen(true)}
      />
      {vm.activeFilterCount > 0 ? (
        <View testID="filters-badge" pointerEvents="none" style={[styles.badge, { backgroundColor: theme.colorScheme.error }]}>
          <Text style={{ color: theme.colorScheme.onError, fontSize: 11, fontWeight: '500', letterSpacing: 0.5 }} height={null}>
            {String(vm.activeFilterCount)}
          </Text>
        </View>
      ) : null}
      <FiltersSheet visible={isOpen} vm={vm} onClose={() => setIsOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  button: { width: 52, height: 52, borderRadius: AppRadii.field },
  // Badge de M3 con etiqueta: alto 16, píldora, padding 4, anclado arriba a la derecha.
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
