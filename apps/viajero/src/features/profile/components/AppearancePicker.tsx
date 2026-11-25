import { View } from 'react-native';

import { SegmentedButton } from '@/ui/components';
import { AppRadii, useTheme, useThemeMode, type ThemeMode } from '@/ui/theme';

/**
 * Selector de apariencia (`SelectorApariencia`): Sistema / Claro / Oscuro sobre el modo global
 * del tema (`useThemeMode`, el `ThemeModeViewModel`). No se persiste (§3.10): al reiniciar la app
 * vuelve a «Sistema», igual que en Flutter.
 */
export function AppearancePicker() {
  const cs = useTheme().colorScheme;
  const { mode, setMode } = useThemeMode();
  return (
    <View style={{ padding: 6, backgroundColor: cs.surfaceContainerLow, borderRadius: AppRadii.card }}>
      <SegmentedButton<ThemeMode>
        segments={[
          { value: 'system', label: 'Sistema', icon: 'brightness_auto_rounded' },
          { value: 'light', label: 'Claro', icon: 'light_mode_rounded' },
          { value: 'dark', label: 'Oscuro', icon: 'dark_mode_rounded' },
        ]}
        selected={mode}
        onChange={setMode}
      />
    </View>
  );
}
