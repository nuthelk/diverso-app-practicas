import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { temaPara, type Brillo, type Tema } from './tema';

/** `ThemeMode` de Flutter. */
export type ModoTema = 'system' | 'light' | 'dark';

interface ValorModo {
  modo: ModoTema;
  setModo: (modo: ModoTema) => void;
  /** Modo efectivo (lo que se pinta). */
  brillo: Brillo;
}

const ContextoModo = createContext<ValorModo | null>(null);
const ContextoTema = createContext<Tema | null>(null);

/**
 * Port de `ThemeModeViewModel` + `MaterialApp(theme:, darkTheme:, themeMode:)`. Arranca en
 * «system» y NO se persiste (igual que Flutter: al reiniciar vuelve a «Sistema»). Cambiar el modo
 * solo cambia el valor del contexto: no remonta a los hijos (el router no se recrea).
 */
export function ThemeProvider({
  children,
  modoInicial = 'system',
}: {
  children: ReactNode;
  modoInicial?: ModoTema;
}) {
  const sistema = useColorScheme();
  const [modo, setModo] = useState<ModoTema>(modoInicial);
  const brillo: Brillo = modo === 'system' ? (sistema === 'dark' ? 'dark' : 'light') : modo;
  const valorModo = useMemo(() => ({ modo, setModo, brillo }), [modo, brillo]);
  return (
    <ContextoModo.Provider value={valorModo}>
      <ContextoTema.Provider value={temaPara(brillo)}>{children}</ContextoTema.Provider>
    </ContextoModo.Provider>
  );
}

/** Tokens del modo efectivo. Sin provider sigue al sistema (como «system»). */
export function useTheme(): Tema {
  const tema = useContext(ContextoTema);
  const sistema = useColorScheme();
  return tema ?? temaPara(sistema === 'dark' ? 'dark' : 'light');
}

/** Modo elegido (system/light/dark) y cómo cambiarlo (selector «Apariencia» del perfil). */
export function useThemeMode(): ValorModo {
  const valor = useContext(ContextoModo);
  const sistema = useColorScheme();
  if (valor) return valor;
  return {
    modo: 'system',
    setModo: () => {
      throw new Error('useThemeMode().setModo necesita un <ThemeProvider> arriba.');
    },
    brillo: sistema === 'dark' ? 'dark' : 'light',
  };
}
