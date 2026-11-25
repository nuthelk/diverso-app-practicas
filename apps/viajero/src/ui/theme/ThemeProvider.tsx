import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { themeFor, type Brightness, type Theme } from './theme';

/** `ThemeMode` de Flutter. */
export type ThemeMode = 'system' | 'light' | 'dark';

interface ThemeModeValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  /** Modo efectivo (lo que se pinta). */
  brightness: Brightness;
}

const ModeContext = createContext<ThemeModeValue | null>(null);
const ThemeContext = createContext<Theme | null>(null);

/**
 * Port de `ThemeModeViewModel` + `MaterialApp(theme:, darkTheme:, themeMode:)`. Arranca en
 * «system» y NO se persiste (igual que Flutter: al reiniciar vuelve a «Sistema»). Cambiar el modo
 * solo cambia el valor del contexto: no remonta a los hijos (el router no se recrea).
 */
export function ThemeProvider({
  children,
  initialMode = 'system',
}: {
  children: ReactNode;
  initialMode?: ThemeMode;
}) {
  const system = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>(initialMode);
  const brightness: Brightness = mode === 'system' ? (system === 'dark' ? 'dark' : 'light') : mode;
  const modeValue = useMemo(() => ({ mode, setMode, brightness }), [mode, brightness]);
  return (
    <ModeContext.Provider value={modeValue}>
      <ThemeContext.Provider value={themeFor(brightness)}>{children}</ThemeContext.Provider>
    </ModeContext.Provider>
  );
}

/** Tokens del modo efectivo. Sin provider sigue al sistema (como «system»). */
export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  const system = useColorScheme();
  return theme ?? themeFor(system === 'dark' ? 'dark' : 'light');
}

/** Modo elegido (system/light/dark) y cómo cambiarlo (selector «Apariencia» del perfil). */
export function useThemeMode(): ThemeModeValue {
  const value = useContext(ModeContext);
  const system = useColorScheme();
  if (value) return value;
  return {
    mode: 'system',
    setMode: () => {
      throw new Error('useThemeMode().setModo necesita un <ThemeProvider> arriba.');
    },
    brightness: system === 'dark' ? 'dark' : 'light',
  };
}
