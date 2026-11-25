import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { IconButton, Text } from '@/ui/components';
import { AppRadios, useTheme } from '@/ui/theme';

import { FiltrosSheet, type FiltrosDelCatalogo } from './FiltrosSheet';

/**
 * Botón junto al buscador que abre la hoja de filtros (`boton_filtros.dart`); la insignia cuenta
 * los filtros activos (oculta en 0). El fondo es negro al 5 % FIJO, también en oscuro (gotcha 19:
 * se preserva tal cual).
 */
export function BotonFiltros({ vm }: { vm: FiltrosDelCatalogo & { filtrosActivos: number } }) {
  const tema = useTheme();
  const [abierta, setAbierta] = useState(false);
  return (
    <View>
      <IconButton
        variante="filledTonal"
        icono="tune_rounded"
        tooltip="Filtros y orden"
        colorFondo="rgba(0, 0, 0, 0.05)"
        colorIcono={tema.colorScheme.onSurface}
        style={estilos.boton}
        onPress={() => setAbierta(true)}
      />
      {vm.filtrosActivos > 0 ? (
        <View testID="insignia-filtros" pointerEvents="none" style={[estilos.insignia, { backgroundColor: tema.colorScheme.error }]}>
          <Text style={{ color: tema.colorScheme.onError, fontSize: 11, fontWeight: '500', letterSpacing: 0.5 }} altura={null}>
            {String(vm.filtrosActivos)}
          </Text>
        </View>
      ) : null}
      <FiltrosSheet visible={abierta} vm={vm} onCerrar={() => setAbierta(false)} />
    </View>
  );
}

const estilos = StyleSheet.create({
  boton: { width: 52, height: 52, borderRadius: AppRadios.field },
  // Badge de M3 con etiqueta: alto 16, píldora, padding 4, anclado arriba a la derecha.
  insignia: {
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
