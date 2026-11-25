import { View } from 'react-native';

import { SegmentedButton } from '@/ui/components';
import { AppRadios, useTheme, useThemeMode, type ModoTema } from '@/ui/theme';

/**
 * Selector de apariencia (`SelectorApariencia`): Sistema / Claro / Oscuro sobre el modo global
 * del tema (`useThemeMode`, el `ThemeModeViewModel`). No se persiste (§3.10): al reiniciar la app
 * vuelve a «Sistema», igual que en Flutter.
 */
export function SelectorApariencia() {
  const cs = useTheme().colorScheme;
  const { modo, setModo } = useThemeMode();
  return (
    <View style={{ padding: 6, backgroundColor: cs.surfaceContainerLow, borderRadius: AppRadios.card }}>
      <SegmentedButton<ModoTema>
        segmentos={[
          { valor: 'system', etiqueta: 'Sistema', icono: 'brightness_auto_rounded' },
          { valor: 'light', etiqueta: 'Claro', icono: 'light_mode_rounded' },
          { valor: 'dark', etiqueta: 'Oscuro', icono: 'dark_mode_rounded' },
        ]}
        seleccionado={modo}
        onCambio={setModo}
      />
    </View>
  );
}
