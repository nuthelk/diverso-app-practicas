import { SplashScreen } from 'expo-router';
import { useEffect, type ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SesionProvider } from '@/features/auth/view-models/SesionProvider';
import { ConsentimientoProvider } from '@/features/legal/view-models/ConsentimientoProvider';
import { NavegacionDeLaApp } from '@/router/NavegacionDeLaApp';
import { ThemeProvider, useDiversoFonts, type ThemeMode } from '@/ui/theme';

import { DependenciesProvider, type Dependencias } from './DependenciesProvider';

/**
 * Los providers raíz (`MultiProvider` de `buildViajeroApp`): dependencias, tema, sesión y
 * consentimiento, en ese orden (la sesión y el consentimiento piden `auth` a las dependencias).
 * El tema solo cambia el valor de su contexto: no remonta la navegación (gotcha 4).
 */
export function ProveedoresDeLaApp({
  dependencias,
  modoTemaInicial,
  children,
}: {
  dependencias: Dependencias;
  modoTemaInicial?: ThemeMode;
  children: ReactNode;
}) {
  return (
    <SafeAreaProvider>
      <DependenciesProvider dependencias={dependencias}>
        <ThemeProvider initialMode={modoTemaInicial}>
          <SesionProvider>
            <ConsentimientoProvider>{children}</ConsentimientoProvider>
          </SesionProvider>
        </ThemeProvider>
      </DependenciesProvider>
    </SafeAreaProvider>
  );
}

/**
 * Raíz de la app (`buildViajeroApp` + `DiversoApp`): providers, carga de fuentes y navegación.
 * `src/app/_layout.tsx` la monta con las dependencias reales; las pruebas de arranque, con dobles
 * (mismo cableado que producción). La splash se oculta cuando las fuentes están listas (o
 * fallaron: entonces RN usa la del sistema).
 */
export function RaizDeLaApp({ dependencias }: { dependencias: Dependencias }) {
  const [fuentesListas, errorFuentes] = useDiversoFonts();
  const listo = fuentesListas || errorFuentes !== null;

  useEffect(() => {
    if (listo) SplashScreen.hideAsync().catch(() => {});
  }, [listo]);

  return (
    <ProveedoresDeLaApp dependencias={dependencias}>
      <NavegacionDeLaApp listo={listo} />
    </ProveedoresDeLaApp>
  );
}
